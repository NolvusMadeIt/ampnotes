import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FolderOpen } from 'lucide-react'
import type {
  AppearanceSettingsDTO,
  CreatePluginManifestInput,
  CreateThemeManifestInput,
  FontFamilyOption,
  MarketplaceStateDTO,
  MarketplaceFolderResult,
  ThemePresetOption,
  ThemeMode
} from '@shared/types'
import { Button } from '@renderer/components/ui/Button'
import { HelpTooltip } from '@renderer/components/ui/HelpTooltip'
import { Modal } from '@renderer/components/ui/Modal'

interface SettingsDialogProps {
  asPage?: boolean
  open?: boolean
  section?: 'general' | 'plugins' | 'themes' | 'all'
  currentTheme: ThemeMode
  appearance: AppearanceSettingsDTO
  marketplaceState: MarketplaceStateDTO
  onClose?: () => void
  onThemeChange: (theme: ThemeMode) => Promise<void>
  onAppearanceChange: (appearance: AppearanceSettingsDTO) => Promise<void>
  onRegisterPlugin: (manifest: CreatePluginManifestInput) => Promise<void>
  onTogglePlugin: (pluginId: string, enabled: boolean) => Promise<void>
  onRemovePlugin: (pluginId: string) => Promise<void>
  onOpenPluginFolder: (pluginId: string) => Promise<MarketplaceFolderResult>
  onRegisterTheme: (manifest: CreateThemeManifestInput) => Promise<void>
  onSetActiveMarketplaceTheme: (themeId: string | null) => Promise<void>
  onRemoveTheme: (themeId: string) => Promise<void>
  onOpenThemeFolder: (themeId: string) => Promise<MarketplaceFolderResult>
  onSaveGroqKey: (apiKey: string) => Promise<void>
  onClearGroqKey: () => Promise<void>
  isGroqKeyConfigured: boolean
  onSignOut: () => Promise<void>
}

const PLUGIN_MANIFEST_PLACEHOLDER = `{
  "id": "tools.wordcount",
  "name": "Word Count",
  "version": "1.0.0",
  "description": "Adds {wordcount} and {tools.wordcount} token support in the markdown editor.",
  "author": "Your Team",
  "entry": "plugins/wordcount/index.js",
  "homepage": "https://example.com/wordcount",
  "permissions": ["prompt.read", "template.read"]
}`

const THEME_MANIFEST_PLACEHOLDER = `{
  "id": "theme.sunset-paper",
  "name": "Sunset Paper",
  "version": "1.0.0",
  "description": "Warm paper tones for focused writing.",
  "author": "Your Team",
  "homepage": "https://example.com/themes/sunset-paper",
  "tokens": {
    "light": {
      "--bg": "#f6efe6",
      "--surface": "#fffaf3",
      "--accent": "#b85a2f"
    },
    "dark": {
      "--bg": "#1f1713",
      "--surface": "#2a201a",
      "--accent": "#f59f6c"
    }
  }
}`

const FONT_OPTIONS: Array<{ value: FontFamilyOption; label: string }> = [
  { value: 'merriweather', label: 'Merriweather' },
  { value: 'sourceSerif', label: 'Source Serif' },
  { value: 'lora', label: 'Lora' },
  { value: 'ibmPlexSans', label: 'IBM Plex Sans' },
  { value: 'publicSans', label: 'Public Sans' }
]

const PRESET_OPTIONS: Array<{ value: ThemePresetOption; label: string }> = [
  { value: 'midnight', label: 'Midnight' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'graphite', label: 'Graphite' },
  { value: 'forest', label: 'Forest' },
  { value: 'sand', label: 'Sand' }
]

const THEME_BUILDER_FIELDS = [
  ['--bg', 'Background'],
  ['--surface', 'Card'],
  ['--surface-2', 'Popover'],
  ['--text', 'Foreground'],
  ['--text-muted', 'Muted'],
  ['--border', 'Border'],
  ['--accent', 'Accent'],
  ['--accent-contrast', 'Accent Foreground'],
  ['--success', 'Success'],
  ['--warning', 'Warning'],
  ['--danger', 'Danger']
] as const

const DEFAULT_THEME_BUILDER = {
  id: 'theme.custom-system',
  name: 'Custom System',
  version: '1.0.0',
  author: 'NolvusMadeIt',
  light: {
    '--bg': '#f7f8fb',
    '--surface': '#ffffff',
    '--surface-2': '#f0f2f5',
    '--text': '#101114',
    '--text-muted': '#606775',
    '--border': '#d9dde5',
    '--accent': '#111111',
    '--accent-contrast': '#ffffff',
    '--success': '#16855f',
    '--warning': '#a86818',
    '--danger': '#b33a3a'
  },
  dark: {
    '--bg': '#090a0d',
    '--surface': '#111318',
    '--surface-2': '#181b22',
    '--text': '#f4f6fb',
    '--text-muted': '#a4adbb',
    '--border': '#252a33',
    '--accent': '#f4f6fb',
    '--accent-contrast': '#090a0d',
    '--success': '#43b581',
    '--warning': '#d69a35',
    '--danger': '#e36a6a'
  },
  radius: '0.5rem',
  shadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
  fontSans: 'Geist, Public Sans, sans-serif',
  fontSerif: 'Source Serif 4, Georgia, serif',
  fontMono: 'JetBrains Mono, monospace'
}

type BuilderMode = 'light' | 'dark'
type ThemeBuilderState = typeof DEFAULT_THEME_BUILDER

function createThemeManifestFromBuilder(builder: ThemeBuilderState): CreateThemeManifestInput {
  return {
    id: builder.id,
    name: builder.name,
    version: builder.version,
    author: builder.author,
    description: 'Created with the AMP theme builder.',
    tokens: {
      light: {
        ...builder.light,
        '--radius-md': builder.radius,
        '--shadow-panel': builder.shadow,
        '--font-sans': builder.fontSans,
        '--font-serif': builder.fontSerif,
        '--font-mono': builder.fontMono
      },
      dark: {
        ...builder.dark,
        '--radius-md': builder.radius,
        '--shadow-panel': builder.shadow,
        '--font-sans': builder.fontSans,
        '--font-serif': builder.fontSerif,
        '--font-mono': builder.fontMono
      }
    }
  }
}

function parseManifestJson<T>(raw: string): T {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('Paste a JSON manifest first.')
  }
  return JSON.parse(trimmed) as T
}

async function copyJson(value: unknown): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
}

function toThemeManifestInput(theme: MarketplaceStateDTO['themes'][number]): CreateThemeManifestInput {
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

function toPluginManifestInput(plugin: MarketplaceStateDTO['plugins'][number]): CreatePluginManifestInput {
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

export function SettingsDialog({
  asPage = false,
  open = true,
  section = 'all',
  currentTheme,
  appearance,
  marketplaceState,
  onClose,
  onThemeChange,
  onAppearanceChange,
  onRegisterPlugin,
  onTogglePlugin,
  onRemovePlugin,
  onOpenPluginFolder,
  onRegisterTheme,
  onSetActiveMarketplaceTheme,
  onRemoveTheme,
  onOpenThemeFolder,
  onSaveGroqKey,
  onClearGroqKey,
  isGroqKeyConfigured,
  onSignOut
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [fontScaleDraft, setFontScaleDraft] = useState(appearance.fontScale)
  const [pluginManifestJson, setPluginManifestJson] = useState('')
  const [editingPluginId, setEditingPluginId] = useState<string | null>(null)
  const [themeManifestJson, setThemeManifestJson] = useState('')
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [themeBuilder, setThemeBuilder] = useState<ThemeBuilderState>(DEFAULT_THEME_BUILDER)
  const [builderMode, setBuilderMode] = useState<BuilderMode>('light')
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const activeThemeName = useMemo(() => {
    const active = marketplaceState.themes.find((item) => item.id === marketplaceState.activeThemeId)
    return active?.name ?? null
  }, [marketplaceState.activeThemeId, marketplaceState.themes])

  const showGeneral = section === 'general' || section === 'all'
  const showPlugins = section === 'plugins' || section === 'all'
  const showThemes = section === 'themes' || section === 'all'

  useEffect(() => {
    setFontScaleDraft(appearance.fontScale)
  }, [appearance.fontScale])

  const runAction = async (actionKey: string, operation: () => Promise<void>) => {
    setMarketplaceError(null)
    setBusyKey(actionKey)
    try {
      await operation()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed.'
      setMarketplaceError(message)
    } finally {
      setBusyKey(null)
    }
  }

  const applyAppearance = async (next: Partial<AppearanceSettingsDTO>) => {
    const merged: AppearanceSettingsDTO = {
      fontFamily: next.fontFamily ?? appearance.fontFamily,
      fontScale: next.fontScale ?? appearance.fontScale,
      themePreset: next.themePreset ?? appearance.themePreset
    }
    await onAppearanceChange(merged)
  }

  const updateBuilderToken = (mode: BuilderMode, token: string, value: string) => {
    setThemeBuilder((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [token]: value
      }
    }))
  }

  const loadBuilderManifest = () => {
    setThemeManifestJson(JSON.stringify(createThemeManifestFromBuilder(themeBuilder), null, 2))
    setEditingThemeId(null)
  }

  const body = (
    <div className="space-y-6">
      {showGeneral && (
        <>
          <section className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-4">
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Theme Mode
              <HelpTooltip text="Pick the light/dark/system mode. Presets and marketplace tokens apply on top." />
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((theme) => (
                <Button
                  key={theme}
                  variant={currentTheme === theme ? 'primary' : 'secondary'}
                  onClick={async () => onThemeChange(theme)}
                >
                  {theme[0].toUpperCase() + theme.slice(1)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted">Active marketplace theme: {activeThemeName ?? 'None'}</p>
          </section>

          <section className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-4">
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Reading & Typography
              <HelpTooltip text="Choose one of five fonts, set font size, and choose one of five built-in theme presets." />
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Font family</span>
                <select
                  className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 outline-none focus:border-accent/10"
                  value={appearance.fontFamily}
                  onChange={async (event) => {
                    await applyAppearance({ fontFamily: event.target.value as FontFamilyOption })
                  }}
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Theme preset</span>
                <select
                  className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 outline-none focus:border-accent/10"
                  value={appearance.themePreset}
                  onChange={async (event) => {
                    await applyAppearance({ themePreset: event.target.value as ThemePresetOption })
                  }}
                >
                  {PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 inline-flex items-center justify-between gap-2 font-medium">
                <span>Font size</span>
                <span className="mono-meta text-xs text-muted">{fontScaleDraft}%</span>
              </span>
              <input
                type="range"
                min={90}
                max={125}
                step={1}
                value={fontScaleDraft}
                className="h-8 w-full accent-accent"
                onChange={(event) => setFontScaleDraft(Number(event.target.value))}
                onBlur={async () => {
                  if (fontScaleDraft !== appearance.fontScale) {
                    await applyAppearance({ fontScale: fontScaleDraft })
                  }
                }}
                onMouseUp={async () => {
                  if (fontScaleDraft !== appearance.fontScale) {
                    await applyAppearance({ fontScale: fontScaleDraft })
                  }
                }}
                onTouchEnd={async () => {
                  if (fontScaleDraft !== appearance.fontScale) {
                    await applyAppearance({ fontScale: fontScaleDraft })
                  }
                }}
              />
            </label>
          </section>

          <section className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Groq API key</h3>
              {isGroqKeyConfigured && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 size={14} />
                  Key saved (gsk_************)
                </span>
              )}
            </div>
            <input
              className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 outline-none focus:border-accent/10"
              placeholder={isGroqKeyConfigured ? 'Enter new key to replace saved key' : 'gsk_...'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            {isGroqKeyConfigured && !apiKey.trim() && (
              <p className="text-xs text-muted">
                Current key is hidden for security. Enter a new key only if you want to replace it.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={!apiKey.trim()}
                onClick={async () => {
                  await onSaveGroqKey(apiKey)
                  setApiKey('')
                }}
              >
                Save Key
              </Button>
              <Button variant="secondary" onClick={onClearGroqKey}>
                Clear Key
              </Button>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-warning/20 bg-warning/10 p-4">
            <h3 className="text-base font-semibold text-warning">Security Guardrails</h3>
            <p className="text-sm text-muted">
              Plugin/theme manifests are validated before storage. For open-source releases, keep execution sandboxed
              and review permissions for every external contribution.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted">
              <li>Use HTTPS-only homepages and signed releases for public plugin/theme packages.</li>
              <li>Never execute unreviewed plugin code with unrestricted filesystem/network access.</li>
              <li>Keep allow-listed permissions small and explicit per plugin.</li>
              <li>Treat imported manifests as untrusted input and validate on both desktop and website backend.</li>
            </ul>
          </section>

          <section className="space-y-2 rounded-xl border border-danger/20 bg-danger/10 p-4">
            <h3 className="text-base font-semibold text-danger">Session</h3>
            <Button variant="danger" onClick={onSignOut}>
              Sign Out
            </Button>
          </section>
        </>
      )}

      {showPlugins && (
        <section className="space-y-4 rounded-xl border border-line/20 bg-surface2 p-4">
          <div>
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Plugins
              <HelpTooltip text="Create and manage plugins. Enabled plugin shortcodes can be used in markdown content." />
            </h3>
            <p className="mt-1 text-sm text-muted">
              Shortcode examples for markdown: <code>{'{wordcount}'}</code> or <code>{'{tools.wordcount}'}</code>.
            </p>
            <p className="mt-1 text-sm text-muted">
              Click <strong>Edit</strong> on an installed plugin, update JSON, then save.
            </p>
          </div>

          {marketplaceError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {marketplaceError}
            </div>
          )}

          <article className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                Plugin Manifest
                <HelpTooltip text="Required: id, name, version. Optional: author, entry, homepage, permissions." />
              </p>
              <Button size="sm" variant="secondary" onClick={async () => copyJson(JSON.parse(PLUGIN_MANIFEST_PLACEHOLDER))}>
                Copy Example
              </Button>
            </div>
            <textarea
              className="min-h-[360px] w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-xs outline-none focus:border-accent/10"
              placeholder={PLUGIN_MANIFEST_PLACEHOLDER}
              value={pluginManifestJson}
              onChange={(event) => setPluginManifestJson(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={busyKey === 'register-plugin'}
                onClick={async () =>
                  runAction('register-plugin', async () => {
                    const manifest = parseManifestJson<CreatePluginManifestInput>(pluginManifestJson)
                    await onRegisterPlugin(manifest)
                    setPluginManifestJson('')
                    setEditingPluginId(null)
                  })
                }
              >
                {editingPluginId ? 'Update Plugin Manifest' : 'Save Plugin Manifest'}
              </Button>
              {editingPluginId && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingPluginId(null)
                    setPluginManifestJson('')
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </article>

          <article className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <p className="text-sm font-semibold">Installed Plugins</p>
            {marketplaceState.plugins.length === 0 ? (
              <p className="text-sm text-muted">No plugins added yet.</p>
            ) : (
              <div className="space-y-2">
                {marketplaceState.plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/20 bg-surface2 p-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {plugin.name} <span className="text-muted">v{plugin.version}</span>
                      </p>
                      <p className="text-xs text-muted">{plugin.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={plugin.enabled ? 'secondary' : 'primary'}
                        disabled={busyKey === `plugin-${plugin.id}`}
                        onClick={async () =>
                          runAction(`plugin-${plugin.id}`, async () => {
                            await onTogglePlugin(plugin.id, !plugin.enabled)
                          })
                        }
                        >
                          {plugin.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingPluginId(plugin.id)
                          setPluginManifestJson(JSON.stringify(toPluginManifestInput(plugin), null, 2))
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyKey === `plugin-folder-${plugin.id}`}
                        onClick={async () =>
                          runAction(`plugin-folder-${plugin.id}`, async () => {
                            const result = await onOpenPluginFolder(plugin.id)
                            if (!result.ok) {
                              throw new Error(result.reason ?? 'Could not open plugin folder')
                            }
                          })
                        }
                      >
                        <FolderOpen size={14} className="mr-2" />
                        Open Folder
                      </Button>
                      <Button size="sm" variant="secondary" onClick={async () => copyJson(plugin)}>
                        Copy JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyKey === `plugin-remove-${plugin.id}`}
                        onClick={async () =>
                          runAction(`plugin-remove-${plugin.id}`, async () => {
                            await onRemovePlugin(plugin.id)
                            if (editingPluginId === plugin.id) {
                              setEditingPluginId(null)
                              setPluginManifestJson('')
                            }
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      {showThemes && (
        <section className="space-y-4 rounded-xl border border-line/20 bg-surface2 p-4">
          <div>
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Themes
              <HelpTooltip text="Create, edit, activate, and share themes." />
            </h3>
            <p className="mt-1 text-sm text-muted">
              Click <strong>Edit</strong> on an installed theme, update JSON, then save.
            </p>
          </div>

          {marketplaceError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {marketplaceError}
            </div>
          )}

          <article className="grid gap-4 rounded-lg border border-line/20 bg-surface p-3 xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Theme Builder</p>
                <div className="inline-flex border border-line/20 bg-surface2">
                  {(['light', 'dark'] as BuilderMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`px-3 py-1 text-xs font-medium ${builderMode === mode ? 'bg-accent text-accentContrast' : 'text-muted'}`}
                      onClick={() => setBuilderMode(mode)}
                    >
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Theme ID</span>
                  <input
                    className="h-9 w-full border border-line/20 bg-surface2 px-2 outline-none focus:border-accent/10"
                    value={themeBuilder.id}
                    onChange={(event) => setThemeBuilder((current) => ({ ...current, id: event.target.value }))}
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Theme Name</span>
                  <input
                    className="h-9 w-full border border-line/20 bg-surface2 px-2 outline-none focus:border-accent/10"
                    value={themeBuilder.name}
                    onChange={(event) => setThemeBuilder((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
              </div>

              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-semibold">Colors</summary>
                <div className="grid gap-2 md:grid-cols-2">
                  {THEME_BUILDER_FIELDS.map(([token, label]) => (
                    <label key={token} className="block text-xs">
                      <span className="mb-1 block font-medium text-muted">{label}</span>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-9 w-10 border border-line/20 bg-surface2"
                          value={themeBuilder[builderMode][token]}
                          onChange={(event) => updateBuilderToken(builderMode, token, event.target.value)}
                        />
                        <input
                          className="h-9 min-w-0 flex-1 border border-line/20 bg-surface2 px-2 outline-none focus:border-accent/10"
                          value={themeBuilder[builderMode][token]}
                          onChange={(event) => updateBuilderToken(builderMode, token, event.target.value)}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </details>

              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-semibold">Typography</summary>
                <div className="grid gap-2">
                  {([
                    ['fontSans', 'Font Sans'],
                    ['fontSerif', 'Font Serif'],
                    ['fontMono', 'Font Mono']
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="mb-1 block font-medium text-muted">{label}</span>
                      <input
                        className="h-9 w-full border border-line/20 bg-surface2 px-2 outline-none focus:border-accent/10"
                        value={themeBuilder[key]}
                        onChange={(event) => setThemeBuilder((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </details>

              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-semibold">Other</summary>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Radius</span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    className="w-full accent-accent"
                    value={Number.parseFloat(themeBuilder.radius)}
                    onChange={(event) => setThemeBuilder((current) => ({ ...current, radius: `${event.target.value}rem` }))}
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Shadow</span>
                  <input
                    className="h-9 w-full border border-line/20 bg-surface2 px-2 outline-none focus:border-accent/10"
                    value={themeBuilder.shadow}
                    onChange={(event) => setThemeBuilder((current) => ({ ...current, shadow: event.target.value }))}
                  />
                </label>
              </details>

              <Button size="sm" variant="primary" onClick={loadBuilderManifest}>
                Load Builder JSON
              </Button>
            </div>

            <div
              className="min-h-[440px] overflow-hidden border border-line/20 p-4"
              style={{
                background: themeBuilder[builderMode]['--bg'],
                color: themeBuilder[builderMode]['--text'],
                borderColor: themeBuilder[builderMode]['--border'],
                borderRadius: themeBuilder.radius,
                fontFamily: themeBuilder.fontSans
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: themeBuilder[builderMode]['--text-muted'] }}>
                <span>Preview</span>
                <span>/</span>
                <span>Cards</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div
                  className="p-4"
                  style={{
                    background: themeBuilder[builderMode]['--surface'],
                    border: `1px solid ${themeBuilder[builderMode]['--border']}`,
                    borderRadius: themeBuilder.radius,
                    boxShadow: themeBuilder.shadow
                  }}
                >
                  <p className="text-xs" style={{ color: themeBuilder[builderMode]['--text-muted'] }}>
                    Total Revenue
                  </p>
                  <p className="mt-1 text-2xl font-semibold">$15,231.89</p>
                  <div className="mt-6 h-16 border-t border-line/20" />
                </div>
                <div
                  className="p-4"
                  style={{
                    background: themeBuilder[builderMode]['--surface'],
                    border: `1px solid ${themeBuilder[builderMode]['--border']}`,
                    borderRadius: themeBuilder.radius,
                    boxShadow: themeBuilder.shadow
                  }}
                >
                  <p className="text-lg font-semibold">Create an account</p>
                  <input
                    readOnly
                    value="me@example.com"
                    className="mt-3 h-9 w-full px-2 text-xs"
                    style={{
                      background: themeBuilder[builderMode]['--surface-2'],
                      border: `1px solid ${themeBuilder[builderMode]['--border']}`,
                      borderRadius: themeBuilder.radius,
                      color: themeBuilder[builderMode]['--text']
                    }}
                  />
                  <button
                    type="button"
                    className="mt-3 h-9 w-full text-xs font-semibold"
                    style={{
                      background: themeBuilder[builderMode]['--accent'],
                      color: themeBuilder[builderMode]['--accent-contrast'],
                      borderRadius: themeBuilder.radius
                    }}
                  >
                    Create account
                  </button>
                </div>
                <div
                  className="md:col-span-2 p-4"
                  style={{
                    background: themeBuilder[builderMode]['--surface'],
                    border: `1px solid ${themeBuilder[builderMode]['--border']}`,
                    borderRadius: themeBuilder.radius,
                    boxShadow: themeBuilder.shadow
                  }}
                >
                  <p className="text-lg font-semibold">Upgrade your subscription</p>
                  <p className="mt-1 text-xs" style={{ color: themeBuilder[builderMode]['--text-muted'] }}>
                    You are currently on the free plan. Upgrade to the pro plan to get access to all features.
                  </p>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <div className="border border-line/20 p-3" style={{ borderColor: themeBuilder[builderMode]['--border'], borderRadius: themeBuilder.radius }}>
                      <p className="font-semibold">Starter Plan</p>
                      <p className="text-xs" style={{ color: themeBuilder[builderMode]['--text-muted'] }}>Perfect for small businesses.</p>
                    </div>
                    <div className="border border-line/20 p-3" style={{ borderColor: themeBuilder[builderMode]['--border'], borderRadius: themeBuilder.radius }}>
                      <p className="font-semibold">Pro Plan</p>
                      <p className="text-xs" style={{ color: themeBuilder[builderMode]['--text-muted'] }}>More features and storage.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                Theme Manifest
                <HelpTooltip text="Required: id, name, version, tokens. Use Edit to update an existing theme." />
              </p>
              <Button size="sm" variant="secondary" onClick={async () => copyJson(JSON.parse(THEME_MANIFEST_PLACEHOLDER))}>
                Copy Example
              </Button>
            </div>
            <textarea
              className="min-h-[360px] w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-xs outline-none focus:border-accent/10"
              placeholder={THEME_MANIFEST_PLACEHOLDER}
              value={themeManifestJson}
              onChange={(event) => setThemeManifestJson(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={busyKey === 'register-theme'}
                onClick={async () =>
                  runAction('register-theme', async () => {
                    const manifest = parseManifestJson<CreateThemeManifestInput>(themeManifestJson)
                    await onRegisterTheme(manifest)
                    setThemeManifestJson('')
                    setEditingThemeId(null)
                  })
                }
              >
                {editingThemeId ? 'Update Theme Manifest' : 'Save Theme Manifest'}
              </Button>
              {editingThemeId && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingThemeId(null)
                    setThemeManifestJson('')
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </article>

          <article className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <p className="text-sm font-semibold">Installed Themes</p>
            {marketplaceState.themes.length === 0 ? (
              <p className="text-sm text-muted">No themes added yet.</p>
            ) : (
              <div className="space-y-2">
                {marketplaceState.themes.map((themeItem) => {
                  const isActive = marketplaceState.activeThemeId === themeItem.id
                  return (
                    <div
                      key={themeItem.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/20 bg-surface2 p-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {themeItem.name} <span className="text-muted">v{themeItem.version}</span>
                        </p>
                        <p className="text-xs text-muted">{themeItem.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={isActive ? 'secondary' : 'primary'}
                          disabled={busyKey === `theme-${themeItem.id}`}
                          onClick={async () =>
                            runAction(`theme-${themeItem.id}`, async () => {
                              await onSetActiveMarketplaceTheme(isActive ? null : themeItem.id)
                            })
                          }
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingThemeId(themeItem.id)
                            setThemeManifestJson(JSON.stringify(toThemeManifestInput(themeItem), null, 2))
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyKey === `theme-folder-${themeItem.id}`}
                          onClick={async () =>
                            runAction(`theme-folder-${themeItem.id}`, async () => {
                              const result = await onOpenThemeFolder(themeItem.id)
                              if (!result.ok) {
                                throw new Error(result.reason ?? 'Could not open theme folder')
                              }
                            })
                          }
                        >
                          <FolderOpen size={14} className="mr-2" />
                          Open Folder
                        </Button>
                        <Button size="sm" variant="secondary" onClick={async () => copyJson(themeItem)}>
                          Copy JSON
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyKey === `theme-remove-${themeItem.id}`}
                          onClick={async () =>
                            runAction(`theme-remove-${themeItem.id}`, async () => {
                              await onRemoveTheme(themeItem.id)
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </article>
        </section>
      )}
    </div>
  )

  if (asPage) {
    return <section className="mx-auto max-w-5xl">{body}</section>
  }

  return (
    <Modal open={open} onClose={onClose ?? (() => undefined)} title="Settings" widthClass="max-w-5xl">
      {body}
    </Modal>
  )
}
