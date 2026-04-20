import { BrowserWindow, dialog } from 'electron'
import { pluginManifestSchema, themeManifestSchema } from '@shared/contracts/ipc'
import { normalizePluginManifest, normalizeThemeManifest, SettingsRepo } from '@main/db/repos/settingsRepo'
import { ProfileRepo } from '@main/db/repos/profileRepo'

type DeepLinkKind = 'plugin' | 'theme'

interface DeepLinkInstalledPayload {
  kind: DeepLinkKind
  id: string
  name: string
  enabled?: boolean
  active?: boolean
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

async function fetchManifest(manifestUrl: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(`Failed to download manifest (${response.status})`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
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
    await dialog.showMessageBox({
      type: 'warning',
      title: 'AMP',
      message: 'Please sign in to AMP before installing marketplace assets.',
      detail: 'Open AMP, sign in to your profile, then click the install button again.'
    })
    return
  }

  const manifestUrl = parsed.searchParams.get('manifest')
  const declaredKind = parsed.searchParams.get('kind')

  if (!manifestUrl) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'AMP',
      message: 'Invalid install link',
      detail: 'The marketplace link is missing a manifest URL.'
    })
    return
  }

  try {
    const manifestJson = await fetchManifest(manifestUrl)
    const kind = inferKind(declaredKind, manifestJson)

    if (kind === 'plugin') {
      const pluginManifest = normalizePluginManifest(pluginManifestSchema.parse(manifestJson))
      const installed = settingsRepo.registerPlugin(session.profileId, pluginManifest, 'marketplace')
      const prompt = await dialog.showMessageBox({
        type: 'question',
        title: 'Plugin Installed',
        message: `${installed.name} installed successfully.`,
        detail: 'Enable this plugin right now?',
        buttons: ['Enable now', 'Keep disabled'],
        defaultId: 0,
        cancelId: 1
      })
      const enabled = prompt.response === 0
      settingsRepo.setPluginEnabled(session.profileId, installed.id, enabled)
      emitInstalled({ kind: 'plugin', id: installed.id, name: installed.name, enabled })
      return
    }

    if (kind === 'theme') {
      const themeManifest = normalizeThemeManifest(themeManifestSchema.parse(manifestJson))
      const installed = settingsRepo.registerTheme(session.profileId, themeManifest, 'marketplace')
      const prompt = await dialog.showMessageBox({
        type: 'question',
        title: 'Theme Installed',
        message: `${installed.name} installed successfully.`,
        detail: 'Set this theme as your active theme now?',
        buttons: ['Set as active', 'Not now'],
        defaultId: 0,
        cancelId: 1
      })
      const active = prompt.response === 0
      if (active) {
        settingsRepo.setActiveMarketplaceTheme(session.profileId, installed.id)
      }
      emitInstalled({ kind: 'theme', id: installed.id, name: installed.name, active })
      return
    }

    await dialog.showMessageBox({
      type: 'error',
      title: 'AMP',
      message: 'Unsupported install link',
      detail: 'Could not determine whether this asset is a plugin or theme.'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Installation failed'
    await dialog.showMessageBox({
      type: 'error',
      title: 'AMP',
      message: 'Could not install marketplace asset',
      detail: message
    })
  }
}
