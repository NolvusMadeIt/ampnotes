import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { app } from 'electron'
import type {
  AppearanceSettingsDTO,
  CreatePluginManifestInput,
  CreateThemeManifestInput,
  FontFamilyOption,
  InstalledPluginDTO,
  InstalledThemeDTO,
  MarketplaceStateDTO,
  ThemePresetOption,
  ThemeMode
} from '@shared/types'
import type { SqliteDatabase } from '../client'

const PERMISSION_ALLOWLIST = new Set([
  'prompt.read',
  'prompt.write',
  'template.read',
  'template.write',
  'share.export',
  'share.import',
  'theme.apply',
  'settings.read'
])

const DEFAULT_APPEARANCE: AppearanceSettingsDTO = {
  fontFamily: 'merriweather',
  fontScale: 100,
  themePreset: 'midnight'
}

function getMarketplaceRoot(): string {
  if (process.env.AMP_MARKETPLACE_PATH) {
    return resolve(process.env.AMP_MARKETPLACE_PATH)
  }

  try {
    if (app?.isReady()) {
      return join(app.getPath('userData'), 'marketplace')
    }
  } catch {
    // Fall back to a local data directory in tests or non-Electron contexts.
  }

  return resolve(process.cwd(), '.ampnotes-data', 'marketplace')
}

function safeSegment(value: string): string {
  return value.trim().replace(/[^a-z0-9._-]/gi, '_')
}

function ensureChildPath(baseDir: string, relativePath: string): string {
  const resolvedBase = resolve(baseDir)
  const resolvedTarget = resolve(resolvedBase, relativePath)
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}\\`) && !resolvedTarget.startsWith(`${resolvedBase}/`)) {
    throw new Error('Unsafe marketplace file path')
  }
  return resolvedTarget
}

function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function createPluginEntrySource(plugin: InstalledPluginDTO): string {
  return [
    `// AMP plugin entry for ${plugin.name}.`,
    '// Keep plugin code small, explicit, and permission-aware.',
    'export function activate(context) {',
    "  return {",
    `    id: ${JSON.stringify(plugin.id)},`,
    `    permissions: ${JSON.stringify(plugin.permissions ?? [])}`,
    '  }',
    '}',
    ''
  ].join('\n')
}

function tokensToCss(theme: InstalledThemeDTO): string {
  const writeBlock = (selector: string, tokens?: Record<string, string>) => {
    if (!tokens || Object.keys(tokens).length === 0) {
      return ''
    }
    const lines = Object.entries(tokens).map(([key, value]) => `  ${key}: ${value};`)
    return [`${selector} {`, ...lines, '}', ''].join('\n')
  }

  return [
    `/* AMP theme tokens for ${theme.name}. */`,
    writeBlock(':root', theme.tokens.light),
    writeBlock(':root[data-theme="dark"]', theme.tokens.dark)
  ].filter(Boolean).join('\n')
}

function toPluginManifest(plugin: InstalledPluginDTO): CreatePluginManifestInput {
  return {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    author: plugin.author,
    entry: plugin.entry,
    homepage: plugin.homepage,
    permissions: plugin.permissions
  }
}

function toThemeManifest(theme: InstalledThemeDTO): CreateThemeManifestInput {
  return {
    id: theme.id,
    name: theme.name,
    version: theme.version,
    description: theme.description,
    author: theme.author,
    homepage: theme.homepage,
    tokens: theme.tokens
  }
}

function normalizeFontFamily(value: unknown): FontFamilyOption {
  if (
    value === 'merriweather' ||
    value === 'sourceSerif' ||
    value === 'lora' ||
    value === 'ibmPlexSans' ||
    value === 'publicSans'
  ) {
    return value
  }
  return DEFAULT_APPEARANCE.fontFamily
}

function normalizeThemePreset(value: unknown): ThemePresetOption {
  if (value === 'midnight' || value === 'ocean' || value === 'graphite' || value === 'forest' || value === 'sand') {
    return value
  }
  return DEFAULT_APPEARANCE.themePreset
}

function normalizeAppearance(input: Partial<AppearanceSettingsDTO> | null | undefined): AppearanceSettingsDTO {
  const fontScaleRaw = Number(input?.fontScale)
  const fontScale =
    Number.isFinite(fontScaleRaw) && fontScaleRaw >= 90 && fontScaleRaw <= 125
      ? Math.round(fontScaleRaw)
      : DEFAULT_APPEARANCE.fontScale

  return {
    fontFamily: normalizeFontFamily(input?.fontFamily),
    fontScale,
    themePreset: normalizeThemePreset(input?.themePreset)
  }
}

export class SettingsRepo {
  constructor(private readonly db: SqliteDatabase) {}

  private getProfileMarketplaceDir(profileId: string): string {
    return join(getMarketplaceRoot(), 'profiles', safeSegment(profileId))
  }

  private getPluginFolder(profileId: string, pluginId: string): string {
    return join(this.getProfileMarketplaceDir(profileId), 'plugins', safeSegment(pluginId))
  }

  private getThemeFolder(profileId: string, themeId: string): string {
    return join(this.getProfileMarketplaceDir(profileId), 'themes', safeSegment(themeId))
  }

  private writePluginPackage(profileId: string, plugin: InstalledPluginDTO): InstalledPluginDTO {
    const folderPath = this.getPluginFolder(profileId, plugin.id)
    mkdirSync(folderPath, { recursive: true })
    const withPath: InstalledPluginDTO = { ...plugin, folderPath }
    writeJsonFile(join(folderPath, 'manifest.json'), toPluginManifest(withPath))

    if (withPath.entry) {
      const entryPath = ensureChildPath(folderPath, withPath.entry)
      if (!existsSync(entryPath)) {
        mkdirSync(dirname(entryPath), { recursive: true })
        writeFileSync(entryPath, createPluginEntrySource(withPath), 'utf8')
      }
    }

    return withPath
  }

  private writeThemePackage(profileId: string, theme: InstalledThemeDTO): InstalledThemeDTO {
    const folderPath = this.getThemeFolder(profileId, theme.id)
    mkdirSync(folderPath, { recursive: true })
    const withPath: InstalledThemeDTO = { ...theme, folderPath }
    writeJsonFile(join(folderPath, 'manifest.json'), toThemeManifest(withPath))
    writeFileSync(join(folderPath, 'tokens.css'), tokensToCss(withPath), 'utf8')
    return withPath
  }

  private getJsonSetting<T>(profileId: string, key: string, fallback: T): T {
    const row = this.db
      .prepare<{ profileId: string; key: string }, { value_json: string }>(
        'SELECT value_json FROM settings WHERE profile_id = @profileId AND key = @key'
      )
      .get({ profileId, key })

    if (!row) {
      return fallback
    }

    try {
      return JSON.parse(row.value_json) as T
    } catch {
      return fallback
    }
  }

  private setJsonSetting(profileId: string, key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO settings (profile_id, key, value_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(profile_id, key)
         DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      )
      .run(profileId, key, JSON.stringify(value), new Date().toISOString())
  }

  getTheme(profileId: string): ThemeMode {
    const parsed = this.getJsonSetting<{ value?: ThemeMode }>(profileId, 'theme', { value: 'system' })
    if (parsed.value === 'light' || parsed.value === 'dark' || parsed.value === 'system') {
      return parsed.value
    }
    return 'system'
  }

  setTheme(profileId: string, theme: ThemeMode): ThemeMode {
    this.setJsonSetting(profileId, 'theme', { value: theme })
    return theme
  }

  getAppearance(profileId: string): AppearanceSettingsDTO {
    const raw = this.getJsonSetting<Partial<AppearanceSettingsDTO>>(profileId, 'appearance', DEFAULT_APPEARANCE)
    const normalized = normalizeAppearance(raw)
    this.setJsonSetting(profileId, 'appearance', normalized)
    return normalized
  }

  setAppearance(profileId: string, appearance: AppearanceSettingsDTO): AppearanceSettingsDTO {
    const normalized = normalizeAppearance(appearance)
    this.setJsonSetting(profileId, 'appearance', normalized)
    return normalized
  }

  getMarketplaceState(profileId: string): MarketplaceStateDTO {
    const plugins = this.getJsonSetting<InstalledPluginDTO[]>(profileId, 'marketplace.plugins', []).map((plugin) => ({
      ...plugin,
      folderPath: plugin.folderPath ?? this.getPluginFolder(profileId, plugin.id)
    }))
    const themes = this.getJsonSetting<InstalledThemeDTO[]>(profileId, 'marketplace.themes', []).map((theme) => ({
      ...theme,
      folderPath: theme.folderPath ?? this.getThemeFolder(profileId, theme.id)
    }))
    const activeThemeId = this.getJsonSetting<{ value: string | null }>(
      profileId,
      'marketplace.activeThemeId',
      { value: null }
    ).value

    return {
      plugins: [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
      themes: [...themes].sort((a, b) => a.name.localeCompare(b.name)),
      activeThemeId: activeThemeId ?? null
    }
  }

  registerPlugin(
    profileId: string,
    manifest: CreatePluginManifestInput,
    source: InstalledPluginDTO['source'] = 'marketplace'
  ): InstalledPluginDTO {
    const normalized = normalizePluginManifest(manifest)
    const state = this.getMarketplaceState(profileId)
    const existing = state.plugins.find((plugin) => plugin.id === normalized.id)
    const installedAt = existing?.installedAt ?? new Date().toISOString()
    const plugin: InstalledPluginDTO = {
      ...normalized,
      enabled: existing?.enabled ?? true,
      installedAt,
      source
    }
    const packagedPlugin = this.writePluginPackage(profileId, plugin)

    const nextPlugins = [...state.plugins.filter((item) => item.id !== normalized.id), packagedPlugin].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    this.setJsonSetting(profileId, 'marketplace.plugins', nextPlugins)
    return packagedPlugin
  }

  setPluginEnabled(profileId: string, pluginId: string, enabled: boolean): InstalledPluginDTO {
    const state = this.getMarketplaceState(profileId)
    const plugin = state.plugins.find((item) => item.id === pluginId)
    if (!plugin) {
      throw new Error('Plugin not found')
    }

    const nextPlugin = { ...plugin, enabled }
    const nextPlugins = state.plugins.map((item) => (item.id === pluginId ? nextPlugin : item))
    this.setJsonSetting(profileId, 'marketplace.plugins', nextPlugins)
    return nextPlugin
  }

  removePlugin(profileId: string, pluginId: string): void {
    const state = this.getMarketplaceState(profileId)
    const nextPlugins = state.plugins.filter((item) => item.id !== pluginId)
    this.setJsonSetting(profileId, 'marketplace.plugins', nextPlugins)
    rmSync(this.getPluginFolder(profileId, pluginId), { recursive: true, force: true })
  }

  registerTheme(
    profileId: string,
    manifest: CreateThemeManifestInput,
    source: InstalledThemeDTO['source'] = 'marketplace'
  ): InstalledThemeDTO {
    const normalized = normalizeThemeManifest(manifest)
    const state = this.getMarketplaceState(profileId)
    const existing = state.themes.find((theme) => theme.id === normalized.id)
    const installedAt = existing?.installedAt ?? new Date().toISOString()
    const theme: InstalledThemeDTO = {
      ...normalized,
      installedAt,
      source
    }
    const packagedTheme = this.writeThemePackage(profileId, theme)

    const nextThemes = [...state.themes.filter((item) => item.id !== normalized.id), packagedTheme].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    this.setJsonSetting(profileId, 'marketplace.themes', nextThemes)
    return packagedTheme
  }

  setActiveMarketplaceTheme(profileId: string, themeId: string | null): string | null {
    if (themeId) {
      const themes = this.getMarketplaceState(profileId).themes
      const exists = themes.some((theme) => theme.id === themeId)
      if (!exists) {
        throw new Error('Theme not found')
      }
    }

    this.setJsonSetting(profileId, 'marketplace.activeThemeId', { value: themeId })
    return themeId
  }

  removeTheme(profileId: string, themeId: string): void {
    const state = this.getMarketplaceState(profileId)
    const nextThemes = state.themes.filter((item) => item.id !== themeId)
    this.setJsonSetting(profileId, 'marketplace.themes', nextThemes)
    rmSync(this.getThemeFolder(profileId, themeId), { recursive: true, force: true })

    if (state.activeThemeId === themeId) {
      this.setJsonSetting(profileId, 'marketplace.activeThemeId', { value: null })
    }
  }

  clearMarketplace(profileId: string): void {
    this.setJsonSetting(profileId, 'marketplace.plugins', [])
    this.setJsonSetting(profileId, 'marketplace.themes', [])
    this.setJsonSetting(profileId, 'marketplace.activeThemeId', { value: null })
  }

  migrateMarketplaceDefaults(profileId: string): void {
    const state = this.getMarketplaceState(profileId)
    if (!Array.isArray(state.plugins) || !Array.isArray(state.themes)) {
      this.clearMarketplace(profileId)
    }
  }

  ensurePluginPackage(profileId: string, pluginId: string): string {
    const plugin = this.getMarketplaceState(profileId).plugins.find((item) => item.id === pluginId)
    if (!plugin) {
      throw new Error('Plugin not found')
    }
    return this.writePluginPackage(profileId, plugin).folderPath ?? this.getPluginFolder(profileId, pluginId)
  }

  ensureThemePackage(profileId: string, themeId: string): string {
    const theme = this.getMarketplaceState(profileId).themes.find((item) => item.id === themeId)
    if (!theme) {
      throw new Error('Theme not found')
    }
    return this.writeThemePackage(profileId, theme).folderPath ?? this.getThemeFolder(profileId, themeId)
  }
}

export function normalizeThemeTokenKeys(input: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    const trimmedKey = key.trim()
    const trimmedValue = value.trim()
    if (!trimmedKey || !trimmedValue) {
      continue
    }
    const normalizedKey = trimmedKey.startsWith('--') ? trimmedKey : `--${trimmedKey}`
    if (!/^--[a-z0-9-]+$/i.test(normalizedKey)) {
      continue
    }
    const lowerValue = trimmedValue.toLowerCase()
    if (lowerValue.includes('url(') || lowerValue.includes('@import') || lowerValue.includes('expression(')) {
      continue
    }
    output[normalizedKey] = trimmedValue.slice(0, 120)
  }
  return output
}

export function normalizeThemeManifest(input: CreateThemeManifestInput): CreateThemeManifestInput {
  return {
    ...input,
    tokens: {
      light: input.tokens.light ? normalizeThemeTokenKeys(input.tokens.light) : undefined,
      dark: input.tokens.dark ? normalizeThemeTokenKeys(input.tokens.dark) : undefined
    }
  }
}

export function normalizePluginManifest(input: CreatePluginManifestInput): CreatePluginManifestInput {
  const permissions = [...new Set((input.permissions ?? []).map((permission) => permission.trim()).filter(Boolean))]
    .filter((permission) => PERMISSION_ALLOWLIST.has(permission))
  const entry = input.entry?.trim()
  const safeEntry =
    entry && /^[a-z0-9_./-]+$/i.test(entry) && !entry.includes('..') ? entry : undefined

  return {
    ...input,
    entry: safeEntry,
    homepage: input.homepage?.trim().startsWith('https://') ? input.homepage.trim() : undefined,
    permissions
  }
}
