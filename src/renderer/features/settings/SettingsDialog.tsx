import { useEffect, useMemo, useRef, useState } from 'react'
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

type ThemeBuilderToken =
  | '--bg'
  | '--surface'
  | '--surface-2'
  | '--text'
  | '--text-muted'
  | '--border'
  | '--popover'
  | '--popover-foreground'
  | '--input'
  | '--ring'
  | '--accent'
  | '--accent-contrast'
  | '--success'
  | '--warning'
  | '--danger'
  | '--chart-1'
  | '--chart-2'
  | '--chart-3'
  | '--chart-4'
  | '--chart-5'
  | '--sidebar'
  | '--sidebar-foreground'
  | '--sidebar-primary'
  | '--sidebar-accent'
  | '--sidebar-border'

type ThemeColorField = readonly [ThemeBuilderToken, string, string]
type ThemeColorSection = {
  title: string
  fields: readonly ThemeColorField[]
}

const THEME_COLOR_SECTIONS: readonly ThemeColorSection[] = [
  {
    title: 'Foundation',
    fields: [
      ['--bg', 'Background', 'Main app canvas'],
      ['--surface', 'Card', 'Prompt cards and panels'],
      ['--surface-2', 'Secondary', 'Navigation hovers and soft panels'],
      ['--text', 'Foreground', 'Primary readable text'],
      ['--text-muted', 'Muted Foreground', 'Helper text and metadata'],
      ['--border', 'Border', 'Dividers and quiet outlines']
    ]
  },
  {
    title: 'Interactive',
    fields: [
      ['--popover', 'Popover', 'Menus, tooltips, floating panels'],
      ['--popover-foreground', 'Popover Foreground', 'Text inside popovers'],
      ['--input', 'Input', 'Fields and editable surfaces'],
      ['--ring', 'Ring', 'Focus states and selected controls'],
      ['--accent', 'Accent', 'Primary action color'],
      ['--accent-contrast', 'Accent Foreground', 'Text on primary actions']
    ]
  },
  {
    title: 'Status',
    fields: [
      ['--success', 'Success', 'Good validation and enabled states'],
      ['--warning', 'Warning', 'Caution and needs-attention states'],
      ['--danger', 'Danger', 'Delete and destructive states']
    ]
  },
  {
    title: 'Charts',
    fields: [
      ['--chart-1', 'Chart 1', 'Primary graph line'],
      ['--chart-2', 'Chart 2', 'Secondary graph line'],
      ['--chart-3', 'Chart 3', 'Bar series'],
      ['--chart-4', 'Chart 4', 'Comparison series'],
      ['--chart-5', 'Chart 5', 'Accent series']
    ]
  },
  {
    title: 'Sidebar',
    fields: [
      ['--sidebar', 'Sidebar', 'Navigation rail background'],
      ['--sidebar-foreground', 'Sidebar Foreground', 'Navigation text'],
      ['--sidebar-primary', 'Sidebar Primary', 'Active navigation item'],
      ['--sidebar-accent', 'Sidebar Accent', 'Hovered navigation item'],
      ['--sidebar-border', 'Sidebar Border', 'Sidebar dividers']
    ]
  }
] as const

const THEME_BUILDER_FIELDS: readonly ThemeColorField[] = THEME_COLOR_SECTIONS.flatMap((section) => section.fields)

const BUILDER_FONT_OPTIONS = {
  fontSans: [
    ['Geist, Public Sans, sans-serif', 'Geist / Public Sans'],
    ['Public Sans, Inter, Segoe UI, sans-serif', 'Public Sans'],
    ['IBM Plex Sans, Inter, Segoe UI, sans-serif', 'IBM Plex Sans'],
    ['Inter, Segoe UI, sans-serif', 'Inter'],
    ['Aptos, Segoe UI, sans-serif', 'Aptos']
  ],
  fontSerif: [
    ['Source Serif 4, Georgia, serif', 'Source Serif 4'],
    ['Merriweather, Georgia, serif', 'Merriweather'],
    ['Lora, Georgia, serif', 'Lora'],
    ['Georgia, Times New Roman, serif', 'Georgia'],
    ['Charter, Bitstream Charter, serif', 'Charter']
  ],
  fontMono: [
    ['JetBrains Mono, monospace', 'JetBrains Mono'],
    ['IBM Plex Mono, monospace', 'IBM Plex Mono'],
    ['SFMono-Regular, Consolas, monospace', 'SF Mono / Consolas'],
    ['Cascadia Code, Consolas, monospace', 'Cascadia Code'],
    ['ui-monospace, monospace', 'System Mono']
  ]
} as const
type BuilderFontKey = keyof typeof BUILDER_FONT_OPTIONS

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
    '--popover': '#ffffff',
    '--popover-foreground': '#101114',
    '--input': '#eef1f5',
    '--ring': '#111111',
    '--accent': '#111111',
    '--accent-contrast': '#ffffff',
    '--success': '#16855f',
    '--warning': '#a86818',
    '--danger': '#b33a3a',
    '--chart-1': '#7c9cff',
    '--chart-2': '#4fb6a3',
    '--chart-3': '#d9984a',
    '--chart-4': '#8c6ce8',
    '--chart-5': '#d45d7c',
    '--sidebar': '#eef1f5',
    '--sidebar-foreground': '#20242c',
    '--sidebar-primary': '#111111',
    '--sidebar-accent': '#e1e6ee',
    '--sidebar-border': '#d2d8e2'
  },
  dark: {
    '--bg': '#090a0d',
    '--surface': '#111318',
    '--surface-2': '#181b22',
    '--text': '#f4f6fb',
    '--text-muted': '#a4adbb',
    '--border': '#252a33',
    '--popover': '#151820',
    '--popover-foreground': '#f4f6fb',
    '--input': '#1d212b',
    '--ring': '#f4f6fb',
    '--accent': '#f4f6fb',
    '--accent-contrast': '#090a0d',
    '--success': '#43b581',
    '--warning': '#d69a35',
    '--danger': '#e36a6a',
    '--chart-1': '#7c9cff',
    '--chart-2': '#43b581',
    '--chart-3': '#d69a35',
    '--chart-4': '#9a7cff',
    '--chart-5': '#e36a9a',
    '--sidebar': '#08090c',
    '--sidebar-foreground': '#d7deea',
    '--sidebar-primary': '#f4f6fb',
    '--sidebar-accent': '#151923',
    '--sidebar-border': '#202532'
  },
  radius: '0.5rem',
  shadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
  fontSans: 'Geist, Public Sans, sans-serif',
  fontSerif: 'Source Serif 4, Georgia, serif',
  fontMono: 'JetBrains Mono, monospace'
}

type BuilderMode = 'light' | 'dark'
type ThemeBuilderState = typeof DEFAULT_THEME_BUILDER
type BuilderColorState = ThemeBuilderState[BuilderMode]

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

function createBuilderColorsFromManifest(tokens: CreateThemeManifestInput['tokens'], mode: BuilderMode): BuilderColorState {
  const colors = { ...DEFAULT_THEME_BUILDER[mode] }
  THEME_BUILDER_FIELDS.forEach(([token]) => {
    colors[token] = tokens[mode]?.[token] ?? colors[token]
  })
  return colors
}

function getSharedThemeToken(
  tokens: CreateThemeManifestInput['tokens'],
  key: string,
  fallback: string
): string {
  return tokens.light?.[key] ?? tokens.dark?.[key] ?? fallback
}

function createThemeBuilderFromManifest(theme: CreateThemeManifestInput): ThemeBuilderState {
  return {
    ...DEFAULT_THEME_BUILDER,
    id: theme.id || DEFAULT_THEME_BUILDER.id,
    name: theme.name || DEFAULT_THEME_BUILDER.name,
    version: theme.version || DEFAULT_THEME_BUILDER.version,
    author: theme.author || DEFAULT_THEME_BUILDER.author,
    light: createBuilderColorsFromManifest(theme.tokens, 'light'),
    dark: createBuilderColorsFromManifest(theme.tokens, 'dark'),
    radius: getSharedThemeToken(theme.tokens, '--radius-md', DEFAULT_THEME_BUILDER.radius),
    shadow: getSharedThemeToken(theme.tokens, '--shadow-panel', DEFAULT_THEME_BUILDER.shadow),
    fontSans: getSharedThemeToken(theme.tokens, '--font-sans', DEFAULT_THEME_BUILDER.fontSans),
    fontSerif: getSharedThemeToken(theme.tokens, '--font-serif', DEFAULT_THEME_BUILDER.fontSerif),
    fontMono: getSharedThemeToken(theme.tokens, '--font-mono', DEFAULT_THEME_BUILDER.fontMono)
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
  const [activeBuilderToken, setActiveBuilderToken] = useState<ThemeBuilderToken | null>(null)
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const tokenPreviewRefs = useRef<Partial<Record<ThemeBuilderToken, HTMLDivElement | null>>>({})

  const activeThemeName = useMemo(() => {
    const active = marketplaceState.themes.find((item) => item.id === marketplaceState.activeThemeId)
    return active?.name ?? null
  }, [marketplaceState.activeThemeId, marketplaceState.themes])

  const showGeneral = section === 'general' || section === 'all'
  const showPlugins = section === 'plugins' || section === 'all'
  const showThemes = section === 'themes' || section === 'all'
  const builderColors = themeBuilder[builderMode]
  const activeTokenLabel = useMemo(() => {
    if (!activeBuilderToken) {
      return null
    }
    return THEME_BUILDER_FIELDS.find(([token]) => token === activeBuilderToken)?.[1] ?? activeBuilderToken
  }, [activeBuilderToken])

  useEffect(() => {
    if (!activeBuilderToken) {
      return
    }
    tokenPreviewRefs.current[activeBuilderToken]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
  }, [activeBuilderToken])

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
  }

  const loadManifestIntoBuilder = () => {
    try {
      const manifest = parseManifestJson<CreateThemeManifestInput>(themeManifestJson)
      setThemeBuilder(createThemeBuilderFromManifest(manifest))
      setEditingThemeId(manifest.id)
      setMarketplaceError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read theme manifest.'
      setMarketplaceError(message)
    }
  }

  const renderBuilderTokenUsage = (token: ThemeBuilderToken, label: string) => {
    const tokenColor = builderColors[token]
    const shellStyle = {
      background: builderColors['--surface-2'],
      color: builderColors['--text'],
      borderRadius: themeBuilder.radius
    }
    const panelStyle = {
      background: builderColors['--surface'],
      color: builderColors['--text'],
      border: `1px solid ${builderColors['--border']}`,
      borderRadius: themeBuilder.radius
    }

    if (token.startsWith('--chart-')) {
      return (
        <div className="mt-3 flex min-h-20 items-end gap-1 p-2" style={shellStyle}>
          {[24, 42, 30, 58, 38].map((height, index) => (
            <span
              key={index}
              className="flex-1"
              style={{
                height,
                background: token === `--chart-${index + 1}` ? tokenColor : builderColors['--text-muted'],
                opacity: token === `--chart-${index + 1}` ? 1 : 0.35,
                borderRadius: '2px'
              }}
            />
          ))}
        </div>
      )
    }

    if (token.startsWith('--sidebar')) {
      return (
        <div
          className="mt-3 min-h-20 space-y-1 p-2 text-[10px]"
          style={{
            background: token === '--sidebar' ? tokenColor : builderColors['--sidebar'],
            color: token === '--sidebar-foreground' ? tokenColor : builderColors['--sidebar-foreground'],
            border: `1px solid ${token === '--sidebar-border' ? tokenColor : builderColors['--sidebar-border']}`,
            borderRadius: themeBuilder.radius
          }}
        >
          <span
            className="block px-2 py-1"
            style={{
              background: token === '--sidebar-primary' ? tokenColor : builderColors['--sidebar-primary'],
              color: builderColors['--accent-contrast'],
              borderRadius: '2px'
            }}
          >
            Active page
          </span>
          <span
            className="block px-2 py-1"
            style={{
              background: token === '--sidebar-accent' ? tokenColor : builderColors['--sidebar-accent'],
              borderRadius: '2px'
            }}
          >
            Hovered tag
          </span>
        </div>
      )
    }

    switch (token) {
      case '--bg':
        return (
          <div className="mt-3 min-h-20 p-2 text-[10px]" style={{ ...shellStyle, background: tokenColor }}>
            <div className="h-full p-2" style={panelStyle}>App canvas around every column</div>
          </div>
        )
      case '--surface':
      case '--surface-2':
        return (
          <div className="mt-3 min-h-20 p-2 text-[10px]" style={shellStyle}>
            <div className="p-3" style={{ ...panelStyle, background: tokenColor }}>
              {token === '--surface' ? 'Prompt card surface' : 'Soft hover / secondary panel'}
            </div>
          </div>
        )
      case '--text':
      case '--text-muted':
        return (
          <div className="mt-3 min-h-20 p-3" style={panelStyle}>
            <p className="text-sm font-semibold" style={{ color: token === '--text' ? tokenColor : builderColors['--text'] }}>
              Prompt title
            </p>
            <p className="mt-1 text-xs" style={{ color: token === '--text-muted' ? tokenColor : builderColors['--text-muted'] }}>
              Added date, helper copy, and metadata
            </p>
          </div>
        )
      case '--border':
        return (
          <div className="mt-3 min-h-20 p-2 text-[10px]" style={shellStyle}>
            <div className="h-full border-2 p-3" style={{ borderColor: tokenColor, borderRadius: themeBuilder.radius }}>
              Dividers and card edges
            </div>
          </div>
        )
      case '--popover':
      case '--popover-foreground':
        return (
          <div className="mt-3 min-h-20 p-3 text-[10px]" style={shellStyle}>
            <div
              className="p-3"
              style={{
                background: token === '--popover' ? tokenColor : builderColors['--popover'],
                color: token === '--popover-foreground' ? tokenColor : builderColors['--popover-foreground'],
                border: `1px solid ${builderColors['--border']}`,
                borderRadius: themeBuilder.radius,
                boxShadow: themeBuilder.shadow
              }}
            >
              Tooltip / popover message
            </div>
          </div>
        )
      case '--input':
      case '--ring':
        return (
          <div className="mt-3 min-h-20 p-3" style={panelStyle}>
            <span
              className="block h-10 px-3 py-2 text-xs"
              style={{
                background: token === '--input' ? tokenColor : builderColors['--input'],
                border: `2px solid ${token === '--ring' ? tokenColor : builderColors['--border']}`,
                borderRadius: themeBuilder.radius,
                color: builderColors['--text']
              }}
            >
              Focused input field
            </span>
          </div>
        )
      case '--accent':
      case '--accent-contrast':
        return (
          <div className="mt-3 grid min-h-20 place-items-center p-2" style={shellStyle}>
            <span
              className="px-4 py-2 text-xs font-semibold"
              style={{
                background: token === '--accent' ? tokenColor : builderColors['--accent'],
                color: token === '--accent-contrast' ? tokenColor : builderColors['--accent-contrast'],
                borderRadius: themeBuilder.radius
              }}
            >
              Primary action
            </span>
          </div>
        )
      case '--success':
      case '--warning':
      case '--danger':
        return (
          <div className="mt-3 min-h-20 p-3" style={shellStyle}>
            <div className="p-3 text-xs" style={{ borderLeft: `4px solid ${tokenColor}`, background: `${tokenColor}20` }}>
              <strong style={{ color: tokenColor }}>{label}</strong>
              <p className="mt-1" style={{ color: builderColors['--text-muted'] }}>
                {label} message state
              </p>
            </div>
          </div>
        )
      default:
        return (
          <div className="mt-3 min-h-20 p-2" style={shellStyle}>
            <div className="h-full" style={{ background: tokenColor, borderRadius: '2px' }} />
          </div>
        )
    }
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
              Click <strong>Edit</strong> on an installed theme to load it into the visual builder and manifest editor.
            </p>
          </div>

          {marketplaceError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {marketplaceError}
            </div>
          )}

          <article className="grid gap-4 rounded-lg border border-line/20 bg-surface p-3 xl:grid-cols-[minmax(360px,0.92fr)_minmax(560px,1.08fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Theme Builder</p>
                  <p className="mt-1 text-xs text-muted">
                    {editingThemeId
                      ? `Editing ${editingThemeId}. Change values here, then sync them to the manifest before saving.`
                      : 'Every token below has a matching preview so you can see where it appears.'}
                  </p>
                </div>
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

              <details open className="space-y-3">
                <summary className="cursor-pointer text-sm font-semibold">Colors</summary>
                <div className="space-y-4">
                  {THEME_COLOR_SECTIONS.map((section) => (
                    <div key={section.title} className="space-y-2">
                      <p className="mono-meta text-[10px] uppercase tracking-[0.18em] text-muted">{section.title}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {section.fields.map(([token, label, description]) => (
                          <label
                            key={token}
                            className={`block cursor-pointer border p-2 text-xs transition-colors ${
                              activeBuilderToken === token
                                ? 'border-accent/40 bg-accent/10'
                                : 'border-line/20 bg-surface2 hover:border-accent/20'
                            }`}
                            onClick={() => setActiveBuilderToken(token)}
                          >
                            <span className="mb-2 flex items-start justify-between gap-3">
                              <span>
                                <span className="block font-semibold text-text">{label}</span>
                                <span className="block text-[10px] leading-4 text-muted">{description}</span>
                              </span>
                              <span
                                className="h-8 w-10 shrink-0 border border-line/20"
                                style={{ background: builderColors[token] }}
                              />
                            </span>
                            <span className="flex gap-2">
                              <input
                                type="color"
                                className="h-9 w-10 border border-line/20 bg-surface"
                                value={builderColors[token]}
                                onFocus={() => setActiveBuilderToken(token)}
                                onChange={(event) => updateBuilderToken(builderMode, token, event.target.value)}
                              />
                              <input
                                className="h-9 min-w-0 flex-1 border border-line/20 bg-surface px-2 font-mono outline-none focus:border-accent/10"
                                value={builderColors[token]}
                                onFocus={() => setActiveBuilderToken(token)}
                                onChange={(event) => updateBuilderToken(builderMode, token, event.target.value)}
                              />
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>

              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-semibold">Typography</summary>
                <div className="grid gap-2">
                  {([
                    ['fontSans', 'Interface font'],
                    ['fontSerif', 'Editorial font'],
                    ['fontMono', 'Code font']
                  ] as const satisfies readonly [BuilderFontKey, string][]).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="mb-1 block font-medium text-muted">{label}</span>
                      <select
                        className="h-9 w-full border border-line/20 bg-surface2 px-2 outline-none focus:border-accent/10"
                        value={themeBuilder[key]}
                        onChange={(event) => setThemeBuilder((current) => ({ ...current, [key]: event.target.value }))}
                      >
                        {!BUILDER_FONT_OPTIONS[key].some(([value]) => value === themeBuilder[key]) && (
                          <option value={themeBuilder[key]}>Current manifest font</option>
                        )}
                        {BUILDER_FONT_OPTIONS[key].map(([value, optionLabel]) => (
                          <option key={value} value={value}>{optionLabel}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="grid gap-2 border border-line/20 bg-surface2 p-3">
                  <p style={{ fontFamily: themeBuilder.fontSans }} className="text-sm">Interface: buttons, forms, and navigation labels.</p>
                  <p style={{ fontFamily: themeBuilder.fontSerif }} className="text-xl font-semibold">Editorial: prompt titles and reading surfaces.</p>
                  <p style={{ fontFamily: themeBuilder.fontMono }} className="text-xs text-muted">Mono: metadata, tokens, and code-like values.</p>
                </div>
              </details>

              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-semibold">Other</summary>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Radius</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      className="w-full accent-accent"
                      value={Number.parseFloat(themeBuilder.radius)}
                      onChange={(event) => setThemeBuilder((current) => ({ ...current, radius: `${event.target.value}rem` }))}
                    />
                    <span className="w-14 text-right font-mono text-[10px] text-muted">{themeBuilder.radius}</span>
                  </div>
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Shadow</span>
                  <input
                    className="h-9 w-full border border-line/20 bg-surface2 px-2 font-mono outline-none focus:border-accent/10"
                    value={themeBuilder.shadow}
                    onChange={(event) => setThemeBuilder((current) => ({ ...current, shadow: event.target.value }))}
                  />
                </label>
              </details>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={loadBuilderManifest}>
                  {editingThemeId ? 'Sync Builder to Manifest' : 'Create Manifest from Builder'}
                </Button>
                {themeManifestJson.trim() && (
                  <Button size="sm" variant="secondary" onClick={loadManifestIntoBuilder}>
                    Load Manifest into Builder
                  </Button>
                )}
              </div>
            </div>

            <div
              className="min-h-[640px] overflow-hidden border p-4"
              style={{
                background: builderColors['--bg'],
                color: builderColors['--text'],
                borderColor: builderColors['--border'],
                borderRadius: themeBuilder.radius,
                fontFamily: themeBuilder.fontSans
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3 text-xs" style={{ color: builderColors['--text-muted'] }}>
                <div className="flex items-center gap-2">
                  <span>Preview</span>
                  <span>/</span>
                  <span>Design System</span>
                  {activeTokenLabel && (
                    <>
                      <span>/</span>
                      <span style={{ color: builderColors['--text'] }}>{activeTokenLabel}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="px-3 py-1 font-semibold"
                  style={{
                    background: builderColors['--accent'],
                    color: builderColors['--accent-contrast'],
                    borderRadius: themeBuilder.radius
                  }}
                >
                  Save
                </button>
              </div>

              <div className="grid gap-3 xl:grid-cols-[160px_1fr]">
                <aside
                  className="space-y-2 p-3"
                  style={{
                    background: builderColors['--sidebar'],
                    color: builderColors['--sidebar-foreground'],
                    border: `1px solid ${builderColors['--sidebar-border']}`,
                    borderRadius: themeBuilder.radius
                  }}
                >
                  <p className="mono-meta text-[10px] uppercase tracking-[0.18em]" style={{ color: builderColors['--text-muted'] }}>Sidebar</p>
                  {['All Pages', 'Starred', 'Themes'].map((item, index) => (
                    <div
                      key={item}
                      className="px-2 py-1.5 text-xs"
                      style={{
                        background: index === 0 ? builderColors['--sidebar-primary'] : index === 2 ? builderColors['--sidebar-accent'] : 'transparent',
                        color: index === 0 ? builderColors['--accent-contrast'] : builderColors['--sidebar-foreground'],
                        borderRadius: themeBuilder.radius
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="grid gap-3 md:grid-cols-2">
                  <div
                    className="p-4"
                    style={{
                      background: builderColors['--surface'],
                      border: `1px solid ${builderColors['--border']}`,
                      borderRadius: themeBuilder.radius,
                      boxShadow: themeBuilder.shadow
                    }}
                  >
                    <p className="text-xs" style={{ color: builderColors['--text-muted'] }}>Card / Revenue</p>
                    <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: themeBuilder.fontSerif }}>$15,231.89</p>
                    <div className="mt-5 flex h-20 items-end gap-2 border-t pt-4" style={{ borderColor: builderColors['--border'] }}>
                      {[36, 48, 30, 42, 58, 34, 66].map((height, index) => (
                        <span
                          key={index}
                          className="flex-1"
                          style={{
                            height,
                            background: builderColors[`--chart-${(index % 5) + 1}` as keyof typeof builderColors],
                            borderRadius: '2px'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    className="p-4"
                    style={{
                      background: builderColors['--surface'],
                      border: `1px solid ${builderColors['--border']}`,
                      borderRadius: themeBuilder.radius,
                      boxShadow: themeBuilder.shadow
                    }}
                  >
                    <p className="text-lg font-semibold">Create an account</p>
                    <p className="mt-1 text-xs" style={{ color: builderColors['--text-muted'] }}>Input, ring, popover, and primary action.</p>
                    <input
                      readOnly
                      value="me@example.com"
                      className="mt-3 h-9 w-full px-2 text-xs"
                      style={{
                        background: builderColors['--input'],
                        border: `1px solid ${builderColors['--ring']}`,
                        borderRadius: themeBuilder.radius,
                        color: builderColors['--text']
                      }}
                    />
                    <div
                      className="mt-2 p-2 text-xs"
                      style={{
                        background: builderColors['--popover'],
                        color: builderColors['--popover-foreground'],
                        border: `1px solid ${builderColors['--border']}`,
                        borderRadius: themeBuilder.radius
                      }}
                    >
                      Popover: validation helper appears here.
                    </div>
                    <button
                      type="button"
                      className="mt-3 h-9 w-full text-xs font-semibold"
                      style={{
                        background: builderColors['--accent'],
                        color: builderColors['--accent-contrast'],
                        borderRadius: themeBuilder.radius
                      }}
                    >
                      Create account
                    </button>
                  </div>

                  <div
                    className="md:col-span-2 p-4"
                    style={{
                      background: builderColors['--surface'],
                      border: `1px solid ${builderColors['--border']}`,
                      borderRadius: themeBuilder.radius,
                      boxShadow: themeBuilder.shadow
                    }}
                  >
                    <p className="text-lg font-semibold">Status States</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {([
                        ['--success', 'Success', 'Prompt validated and ready.'],
                        ['--warning', 'Warning', 'Missing target or use case.'],
                        ['--danger', 'Danger', 'Delete or destructive action.']
                      ] as const).map(([token, label, text]) => (
                        <div
                          key={token}
                          className="p-3 text-xs"
                          style={{
                            background: `${builderColors[token]}22`,
                            border: `1px solid ${builderColors[token]}`,
                            color: builderColors['--text'],
                            borderRadius: themeBuilder.radius
                          }}
                        >
                          <p className="font-semibold" style={{ color: builderColors[token] }}>{label}</p>
                          <p className="mt-1" style={{ color: builderColors['--text-muted'] }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold" style={{ color: builderColors['--text-muted'] }}>Token Usage Preview</p>
                <p className="mb-3 text-[10px] leading-4" style={{ color: builderColors['--text-muted'] }}>
                  Each token has its own card so the color editor and the preview point to the same UI role.
                </p>
                <div className="space-y-4">
                  {THEME_COLOR_SECTIONS.map((section) => (
                    <section key={section.title} className="space-y-2">
                      <p className="mono-meta text-[10px] uppercase tracking-[0.18em]" style={{ color: builderColors['--text-muted'] }}>
                        {section.title}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {section.fields.map(([token, label, description]) => (
                          <div
                            key={token}
                            ref={(node) => {
                              tokenPreviewRefs.current[token] = node
                            }}
                            className="p-2 text-xs transition-shadow"
                            style={{
                              background: builderColors['--surface'],
                              border: `1px solid ${
                                activeBuilderToken === token ? builderColors['--accent'] : builderColors['--border']
                              }`,
                              borderRadius: themeBuilder.radius,
                              boxShadow: activeBuilderToken === token ? `0 0 0 3px ${builderColors['--accent']}22` : 'none'
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span>
                                <p className="font-semibold">{label}</p>
                                <p className="mt-0.5 text-[10px] leading-4" style={{ color: builderColors['--text-muted'] }}>{description}</p>
                              </span>
                              <span
                                className="h-7 w-7 shrink-0"
                                style={{
                                  background: builderColors[token],
                                  borderRadius: '2px'
                                }}
                              />
                            </div>
                            {renderBuilderTokenUsage(token, label)}
                            <p className="mt-2 font-mono text-[10px]" style={{ color: builderColors['--text-muted'] }}>{token}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </article>
          <article className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                Theme Manifest
                <HelpTooltip text="Advanced/raw JSON view. For visual changes, edit in the Theme Builder and sync back here before saving." />
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
                {editingThemeId ? 'Update Theme' : 'Save Theme'}
              </Button>
              {editingThemeId && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingThemeId(null)
                    setThemeManifestJson('')
                    setThemeBuilder(DEFAULT_THEME_BUILDER)
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
                            const manifest = toThemeManifestInput(themeItem)
                            setEditingThemeId(themeItem.id)
                            setThemeBuilder(createThemeBuilderFromManifest(manifest))
                            setThemeManifestJson(JSON.stringify(manifest, null, 2))
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
    return <section className="mx-auto w-full max-w-7xl">{body}</section>
  }

  return (
    <Modal open={open} onClose={onClose ?? (() => undefined)} title="Settings" widthClass="max-w-7xl">
      {body}
    </Modal>
  )
}
