import { BrowserWindow } from 'electron'
import { pluginManifestSchema, themeManifestSchema } from '@shared/contracts/ipc'
import { normalizePluginManifest, normalizeThemeManifest, SettingsRepo } from '@main/db/repos/settingsRepo'
import { ProfileRepo } from '@main/db/repos/profileRepo'

type DeepLinkKind = 'plugin' | 'theme'

interface MarketplaceManifestMetadata {
  schemaVersion?: number
  compatibility?: string
  screenshot?: string
  checksum?: string
  entry?: string
  tokens?: unknown
}

interface DeepLinkInstalledPayload {
  kind: DeepLinkKind
  id: string
  name: string
  enabled?: boolean
  active?: boolean
}

interface DeepLinkNoticePayload {
  tone: 'info' | 'success' | 'warning' | 'danger'
  message: string
}

let linkHandler: ((url: string) => Promise<void>) | null = null
const pendingLinks: string[] = []

export const AMP_PROTOCOL = 'ampnotes://'

export function findProtocolUrl(argv: string[]): string | null {
  const found = argv.find((arg) => typeof arg === 'string' && arg.startsWith(AMP_PROTOCOL))
  return found ?? null
}

export function enqueueProtocolUrl(url: string): void {
  if (linkHandler) {
    void linkHandler(url)
    return
  }
  pendingLinks.push(url)
}

export function setProtocolHandler(handler: (url: string) => Promise<void>): void {
  linkHandler = handler
  if (pendingLinks.length === 0) {
    return
  }
  const queued = [...pendingLinks]
  pendingLinks.length = 0
  for (const url of queued) {
    void handler(url)
  }
}

function emitInstalled(payload: DeepLinkInstalledPayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('marketplace.deepLinkInstalled', payload)
  }
}

function emitNotice(payload: DeepLinkNoticePayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('marketplace.deepLinkNotice', payload)
  }
}

function inferKind(input: string | null, manifest: unknown): DeepLinkKind | null {
  if (input === 'plugin' || input === 'theme') {
    return input
  }
  const id = typeof manifest === 'object' && manifest ? String((manifest as { id?: string }).id ?? '') : ''
  if (id.startsWith('plugin.')) {
    return 'plugin'
  }
  if (id.startsWith('theme.')) {
    return 'theme'
  }
  return null
}

function decodeMarketplaceCode(rawCode: string, declaredKind: string | null): unknown {
  const trimmed = rawCode.trim()
  if (!trimmed) {
    throw new Error('Marketplace install code is missing.')
  }
  const expectedPrefix = declaredKind === 'plugin' ? 'amp-plugin:' : declaredKind === 'theme' ? 'amp-theme:' : null
  const payload = expectedPrefix && trimmed.startsWith(expectedPrefix) ? trimmed.slice(expectedPrefix.length).trim() : trimmed
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    throw new Error('Marketplace install code is invalid or corrupted.')
  }
}

function assertMarketplaceManifestV1(kind: DeepLinkKind, manifest: unknown): void {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Marketplace manifest is missing.')
  }
  const metadata = manifest as MarketplaceManifestMetadata
  if (metadata.schemaVersion !== 1) {
    throw new Error('Marketplace manifest must use schemaVersion 1.')
  }
  if (!metadata.compatibility?.trim()) {
    throw new Error('Marketplace manifest must include compatibility metadata.')
  }
  if (!metadata.screenshot?.trim()) {
    throw new Error('Marketplace manifest must include a screenshot.')
  }
  if (!metadata.checksum?.trim() || !/^sha256:[a-f0-9]{64}$/i.test(metadata.checksum)) {
    throw new Error('Marketplace manifest must include a valid checksum.')
  }
  if (kind === 'plugin' && !metadata.entry?.trim()) {
    throw new Error('Plugin manifest must include an entry file.')
  }
  if (kind === 'theme' && !metadata.tokens) {
    throw new Error('Theme manifest must include token data.')
  }
}

export async function handleInstallDeepLink(
  url: string,
  profileRepo: ProfileRepo,
  settingsRepo: SettingsRepo
): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return
  }

  if (parsed.protocol !== 'ampnotes:') {
    return
  }
  if (parsed.hostname !== 'install') {
    return
  }

  const session = profileRepo.getActiveSession()
  if (!session) {
    emitNotice({
      tone: 'warning',
      message: 'Sign in to AMP before installing marketplace assets, then click install again.'
    })
    return
  }

  const manifestCode = parsed.searchParams.get('code')
  const declaredKind = parsed.searchParams.get('kind')

  if (!manifestCode) {
    emitNotice({
      tone: 'danger',
      message: 'Invalid marketplace install link. The install code is missing.'
    })
    return
  }

  try {
    const manifestJson = decodeMarketplaceCode(manifestCode, declaredKind)
    const kind = inferKind(declaredKind, manifestJson)

    if (kind === 'plugin') {
      assertMarketplaceManifestV1(kind, manifestJson)
      const pluginManifest = normalizePluginManifest(pluginManifestSchema.parse(manifestJson))
      const installed = settingsRepo.registerPlugin(session.profileId, pluginManifest, 'marketplace')
      const enabled = false
      settingsRepo.setPluginEnabled(session.profileId, installed.id, enabled)
      emitInstalled({ kind: 'plugin', id: installed.id, name: installed.name, enabled })
      return
    }

    if (kind === 'theme') {
      assertMarketplaceManifestV1(kind, manifestJson)
      const themeManifest = normalizeThemeManifest(themeManifestSchema.parse(manifestJson))
      const installed = settingsRepo.registerTheme(session.profileId, themeManifest, 'marketplace')
      const active = false
      emitInstalled({ kind: 'theme', id: installed.id, name: installed.name, active })
      return
    }

    emitNotice({
      tone: 'danger',
      message: 'Unsupported marketplace install link. AMP could not tell whether it is a plugin or theme.'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Installation failed'
    emitNotice({
      tone: 'danger',
      message: `Could not install marketplace asset. ${message}`
    })
  }
}
