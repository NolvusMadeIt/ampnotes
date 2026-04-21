import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, FolderOpen } from 'lucide-react'
import type {
  AdminProfileDTO,
  AdminProfileInput,
  AppearanceSettingsDTO,
  CreatePluginManifestInput,
  CreateThemeManifestInput,
  FontFamilyOption,
  MarketplaceStateDTO,
  MarketplaceFolderResult,
  ThemePresetOption,
  ThemeMode
} from '@shared/types'
import { pluginManifestSchema, themeManifestSchema } from '@shared/contracts/ipc'
import { Button } from '@renderer/components/ui/Button'
import { HelpTooltip } from '@renderer/components/ui/HelpTooltip'
import { Modal } from '@renderer/components/ui/Modal'

interface SettingsDialogProps {
  asPage?: boolean
  open?: boolean
  section?: 'general' | 'plugins' | 'themes' | 'admin' | 'all'
  currentTheme: ThemeMode
  appearance: AppearanceSettingsDTO
  marketplaceState: MarketplaceStateDTO
  marketplaceBaseUrl: string
  defaultMarketplaceBaseUrl: string
  onClose?: () => void
  onThemeChange: (theme: ThemeMode) => Promise<void>
  onAppearanceChange: (appearance: AppearanceSettingsDTO) => Promise<void>
  onMarketplaceBaseUrlChange: (url: string) => Promise<void>
  onRegisterPlugin: (manifest: CreatePluginManifestInput) => Promise<void>
  onImportPluginManifestFile: () => Promise<void>
  onImportPluginFromFolder: () => Promise<void>
  onExportPluginManifest: (pluginId: string) => Promise<void>
  onTogglePlugin: (pluginId: string, enabled: boolean) => Promise<void>
  onRemovePlugin: (pluginId: string) => Promise<void>
  onOpenPluginFolder: (pluginId: string) => Promise<MarketplaceFolderResult>
  onRegisterTheme: (manifest: CreateThemeManifestInput) => Promise<void>
  onImportThemeManifestFile: () => Promise<void>
  onImportThemeFromFolder: () => Promise<void>
  onExportThemeManifest: (themeId: string) => Promise<void>
  onSetActiveMarketplaceTheme: (themeId: string | null) => Promise<void>
  onRemoveTheme: (themeId: string) => Promise<void>
  onOpenThemeFolder: (themeId: string) => Promise<MarketplaceFolderResult>
  onSaveGroqKey: (apiKey: string) => Promise<void>
  onClearGroqKey: () => Promise<void>
  isGroqKeyConfigured: boolean
  adminProfile: AdminProfileDTO | null
  onSaveAdminProfile: (profile: AdminProfileInput) => Promise<void>
  onSetAdminPin: (pin: string) => Promise<void>
  onClearAdminPin: () => Promise<void>
  onVerifyAdminPin: (pin: string) => Promise<{ ok: boolean }>
  onSignOut: () => Promise<void>
}

const PLUGIN_MANIFEST_PLACEHOLDER = `{
  "id": "tools.wordcount",
  "name": "Word Count",
  "version": "1.0.0",
  "description": "Adds {wordcount} and {tools.wordcount} token support in the markdown editor.",
  "author": "Your Team",
  "socials": {
    "github": "https://github.com/your-team"
  },
  "credits": {
    "name": "Your Team",
    "socials": {
      "website": "https://example.com"
    }
  },
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
  "socials": {
    "github": "https://github.com/your-team"
  },
  "credits": {
    "name": "Your Team",
    "socials": {
      "website": "https://example.com"
    }
  },
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
  | '--icon'
  | '--icon-muted'
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

type ThemeColorField = readonly [ThemeBuilderToken, string, string]
type ThemeColorSection = {
  title: string
  fields: readonly ThemeColorField[]
}

const THEME_COLOR_SECTIONS: readonly ThemeColorSection[] = [
  {
    title: 'App Shell',
    fields: [
      ['--bg', 'Background', 'Main app canvas'],
      ['--text', 'Foreground', 'Primary readable text'],
      ['--text-muted', 'Muted Foreground', 'Helper text and metadata'],
      ['--icon', 'Icon', 'Primary tool and navigation icons'],
      ['--icon-muted', 'Muted Icon', 'Secondary and inactive icons'],
      ['--border', 'Border', 'Dividers and quiet outlines']
    ]
  },
  {
    title: 'Surfaces',
    fields: [
      ['--surface', 'Panel', 'Side nav, editor, and settings panels'],
      ['--surface-2', 'Soft Surface', 'Selected nav rows, prompt cards, and secondary panels'],
      ['--popover', 'Popover', 'Menus, tooltips, floating panels'],
      ['--popover-foreground', 'Popover Text', 'Text inside popovers']
    ]
  },
  {
    title: 'Controls',
    fields: [
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
    '--icon': '#303844',
    '--icon-muted': '#758091',
    '--border': '#d9dde5',
    '--popover': '#ffffff',
    '--popover-foreground': '#101114',
    '--input': '#eef1f5',
    '--ring': '#111111',
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
    '--icon': '#dfe6f3',
    '--icon-muted': '#8e99aa',
    '--border': '#252a33',
    '--popover': '#151820',
    '--popover-foreground': '#f4f6fb',
    '--input': '#1d212b',
    '--ring': '#f4f6fb',
    '--accent': '#f4f6fb',
    '--accent-contrast': '#090a0d',
    '--success': '#43b581',
    '--warning': '#d69a35',
    '--danger': '#e36a6a'
  },
  radius: '0.5rem',
  radiusSm: '5px',
  radiusMd: '6px',
  radiusLg: '8px',
  radiusXl: '10px',
  shadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
  fontSans: 'Geist, Public Sans, sans-serif',
  fontSerif: 'Source Serif 4, Georgia, serif',
  fontMono: 'JetBrains Mono, monospace',
  fontSizeBase: '100%',
  lineHeightBody: '1.62',
  lineHeightTight: '1.18',
  letterSpacingHeading: '0',
  letterSpacingMeta: '0.18em',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '700',
  controlHeightSm: '2rem',
  controlHeightMd: '2.25rem',
  controlPaddingX: '0.75rem',
  panelPadding: '0.75rem',
  panelGap: '0.75rem',
  sidebarWidth: '280px',
  scrollbarSize: '10px',
  focusOutlineWidth: '2px',
  ambientA: 'rgba(79, 124, 255, 0.08)',
  ambientB: 'rgba(67, 83, 104, 0.06)',
  ambientOverlay: 'rgba(255, 255, 255, 0.24)',
  toastBg: '#11151d',
  toastText: '#e7edf8',
  toastMuted: '#98a7bc',
  toastBorder: '#1f2734'
}

type BuilderMode = 'light' | 'dark'
type ThemeBuilderState = typeof DEFAULT_THEME_BUILDER
type BuilderColorState = ThemeBuilderState[BuilderMode]

const SHARED_BUILDER_TOKEN_KEYS = [
  ['--radius-sm', 'radiusSm'],
  ['--radius-md', 'radiusMd'],
  ['--radius-lg', 'radiusLg'],
  ['--radius-xl', 'radiusXl'],
  ['--shadow-panel', 'shadow'],
  ['--font-sans', 'fontSans'],
  ['--font-serif', 'fontSerif'],
  ['--font-mono', 'fontMono'],
  ['--font-size-base', 'fontSizeBase'],
  ['--line-height-body', 'lineHeightBody'],
  ['--line-height-tight', 'lineHeightTight'],
  ['--letter-spacing-heading', 'letterSpacingHeading'],
  ['--letter-spacing-meta', 'letterSpacingMeta'],
  ['--font-weight-regular', 'fontWeightRegular'],
  ['--font-weight-medium', 'fontWeightMedium'],
  ['--font-weight-semibold', 'fontWeightSemibold'],
  ['--control-height-sm', 'controlHeightSm'],
  ['--control-height-md', 'controlHeightMd'],
  ['--control-padding-x', 'controlPaddingX'],
  ['--panel-padding', 'panelPadding'],
  ['--panel-gap', 'panelGap'],
  ['--sidebar-width', 'sidebarWidth'],
  ['--scrollbar-size', 'scrollbarSize'],
  ['--focus-outline-width', 'focusOutlineWidth'],
  ['--ambient-a', 'ambientA'],
  ['--ambient-b', 'ambientB'],
  ['--ambient-overlay', 'ambientOverlay'],
  ['--toast-bg', 'toastBg'],
  ['--toast-text', 'toastText'],
  ['--toast-muted', 'toastMuted'],
  ['--toast-border', 'toastBorder']
] as const satisfies readonly [string, keyof ThemeBuilderState][]

function createSharedBuilderTokens(builder: ThemeBuilderState): Record<string, string> {
  return Object.fromEntries(SHARED_BUILDER_TOKEN_KEYS.map(([token, key]) => [token, String(builder[key])]))
}

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
        ...createSharedBuilderTokens(builder)
      },
      dark: {
        ...builder.dark,
        ...createSharedBuilderTokens(builder)
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
    ...Object.fromEntries(
      SHARED_BUILDER_TOKEN_KEYS.map(([token, key]) => [key, getSharedThemeToken(theme.tokens, token, String(DEFAULT_THEME_BUILDER[key]))])
    )
  }
}

type MarketplaceCodeKind = 'plugin' | 'theme'

const MARKETPLACE_CODE_PREFIXES: Record<MarketplaceCodeKind, string> = {
  plugin: 'amp-plugin:',
  theme: 'amp-theme:'
}

function formatValidationError(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues?: Array<{ path?: Array<string | number>; message?: string }> }).issues
    if (Array.isArray(issues) && issues.length > 0) {
      return issues
        .slice(0, 4)
        .map((issue) => `${issue.path?.join('.') || 'manifest'}: ${issue.message ?? 'Invalid value'}`)
        .join(' ')
    }
  }
  return error instanceof Error ? error.message : 'Manifest validation failed.'
}

function parseManifestJson(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('Paste a JSON manifest first.')
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error('Manifest must be valid JSON.')
  }
}

function parsePluginManifestJson(raw: string): CreatePluginManifestInput {
  try {
    return pluginManifestSchema.parse(parseManifestJson(raw))
  } catch (error) {
    throw new Error(formatValidationError(error))
  }
}

function parseThemeManifestJson(raw: string): CreateThemeManifestInput {
  try {
    return themeManifestSchema.parse(parseManifestJson(raw))
  } catch (error) {
    throw new Error(formatValidationError(error))
  }
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function createMarketplaceCode(kind: MarketplaceCodeKind, manifest: CreatePluginManifestInput | CreateThemeManifestInput): string {
  return `${MARKETPLACE_CODE_PREFIXES[kind]}${toBase64Url(JSON.stringify(manifest))}`
}

function decodeMarketplaceCode(kind: MarketplaceCodeKind, rawCode: string): CreatePluginManifestInput | CreateThemeManifestInput {
  const trimmed = rawCode.trim()
  if (!trimmed) {
    throw new Error('Paste a marketplace code first.')
  }
  const expectedPrefix = MARKETPLACE_CODE_PREFIXES[kind]
  const otherKind = kind === 'plugin' ? 'theme' : 'plugin'
  const otherPrefix = MARKETPLACE_CODE_PREFIXES[otherKind]
  if (trimmed.startsWith(otherPrefix)) {
    throw new Error(`This is a ${otherKind} code. Paste a ${kind} code here.`)
  }
  const payload = trimmed.startsWith(expectedPrefix) ? trimmed.slice(expectedPrefix.length).trim() : trimmed
  let manifestJson: string
  try {
    manifestJson = fromBase64Url(payload)
  } catch {
    throw new Error('Marketplace code is invalid or corrupted.')
  }
  return kind === 'plugin' ? parsePluginManifestJson(manifestJson) : parseThemeManifestJson(manifestJson)
}

async function copyMarketplaceCode(kind: MarketplaceCodeKind, rawManifestJson: string): Promise<void> {
  const manifest = kind === 'plugin' ? parsePluginManifestJson(rawManifestJson) : parseThemeManifestJson(rawManifestJson)
  await navigator.clipboard.writeText(createMarketplaceCode(kind, manifest))
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
    socials: theme.socials,
    credits: theme.credits,
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
    socials: plugin.socials,
    credits: plugin.credits,
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
  marketplaceBaseUrl,
  defaultMarketplaceBaseUrl,
  onClose,
  onThemeChange,
  onAppearanceChange,
  onMarketplaceBaseUrlChange,
  onRegisterPlugin,
  onImportPluginManifestFile,
  onImportPluginFromFolder,
  onExportPluginManifest,
  onTogglePlugin,
  onRemovePlugin,
  onOpenPluginFolder,
  onRegisterTheme,
  onImportThemeManifestFile,
  onImportThemeFromFolder,
  onExportThemeManifest,
  onSetActiveMarketplaceTheme,
  onRemoveTheme,
  onOpenThemeFolder,
  onSaveGroqKey,
  onClearGroqKey,
  isGroqKeyConfigured,
  adminProfile,
  onSaveAdminProfile,
  onSetAdminPin,
  onClearAdminPin,
  onVerifyAdminPin,
  onSignOut
}: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<'general' | 'plugins' | 'themes' | 'customizeThemes' | 'admin'>(
    section === 'plugins' || section === 'themes' || section === 'admin' ? section : 'general'
  )
  const [apiKey, setApiKey] = useState('')
  const [fontScaleDraft, setFontScaleDraft] = useState(appearance.fontScale)
  const [marketplaceUrlDraft, setMarketplaceUrlDraft] = useState(marketplaceBaseUrl)
  const [pluginManifestJson, setPluginManifestJson] = useState('')
  const [pluginMarketplaceCode, setPluginMarketplaceCode] = useState('')
  const [editingPluginId, setEditingPluginId] = useState<string | null>(null)
  const [themeManifestJson, setThemeManifestJson] = useState('')
  const [themeMarketplaceCode, setThemeMarketplaceCode] = useState('')
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [themeBuilder, setThemeBuilder] = useState<ThemeBuilderState>(DEFAULT_THEME_BUILDER)
  const [builderMode, setBuilderMode] = useState<BuilderMode>('light')
  const [activeBuilderToken, setActiveBuilderToken] = useState<ThemeBuilderToken | null>(null)
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [adminDraft, setAdminDraft] = useState<AdminProfileInput>({
    displayName: adminProfile?.displayName ?? '',
    avatarUrl: adminProfile?.avatarUrl,
    socials: adminProfile?.socials ?? {}
  })
  const [adminPinDraft, setAdminPinDraft] = useState('')
  const [adminVerifyPinDraft, setAdminVerifyPinDraft] = useState('')
  const [adminMessage, setAdminMessage] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const tokenPreviewRefs = useRef<Partial<Record<ThemeBuilderToken, HTMLDivElement | null>>>({})

  const activeThemeName = useMemo(() => {
    const active = marketplaceState.themes.find((item) => item.id === marketplaceState.activeThemeId)
    return active?.name ?? null
  }, [marketplaceState.activeThemeId, marketplaceState.themes])
  const themePresetSelectValue = marketplaceState.activeThemeId
    ? `theme:${marketplaceState.activeThemeId}`
    : `preset:${appearance.themePreset}`

  useEffect(() => {
    setActiveSection(section === 'plugins' || section === 'themes' || section === 'admin' ? section : 'general')
  }, [section])

  useEffect(() => {
    if (!adminProfile) {
      return
    }
    setAdminDraft({
      displayName: adminProfile.displayName,
      avatarUrl: adminProfile.avatarUrl,
      socials: adminProfile.socials
    })
  }, [adminProfile])

  const showGeneral = activeSection === 'general'
  const showPlugins = activeSection === 'plugins'
  const showThemes = activeSection === 'themes'
  const showCustomizeThemes = activeSection === 'customizeThemes'
  const showAdmin = activeSection === 'admin'
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

  useEffect(() => {
    setMarketplaceUrlDraft(marketplaceBaseUrl)
  }, [marketplaceBaseUrl])

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

  const loadManifestFromCode = async (
    actionKey: string,
    rawCode: string,
    kind: MarketplaceCodeKind,
    onLoaded: (payload: string) => void
  ) => {
    const code = rawCode.trim()
    if (!code) {
      setMarketplaceError('Paste a marketplace code first.')
      return
    }
    await runAction(actionKey, async () => {
      const manifest = decodeMarketplaceCode(kind, code)
      onLoaded(JSON.stringify(manifest, null, 2))
    })
  }

  const applyAppearance = async (next: Partial<AppearanceSettingsDTO>) => {
    const merged: AppearanceSettingsDTO = {
      fontFamily: next.fontFamily ?? appearance.fontFamily,
      fontScale: next.fontScale ?? appearance.fontScale,
      themePreset: next.themePreset ?? appearance.themePreset
    }
    await onAppearanceChange(merged)
  }

  const handleSaveAdminProfile = async () => {
    setAdminError(null)
    setAdminMessage(null)
    const displayName = adminDraft.displayName?.trim()
    if (!displayName) {
      setAdminError('Display name is required.')
      return
    }
    await runAction('admin-save-profile', async () => {
      await onSaveAdminProfile({
        displayName,
        avatarUrl: adminDraft.avatarUrl?.trim() || undefined,
        socials: {
          github: adminDraft.socials?.github?.trim() || undefined,
          x: adminDraft.socials?.x?.trim() || undefined,
          website: adminDraft.socials?.website?.trim() || undefined
        },
        windowsDevicePinHintEnabled: Boolean(adminProfile?.security.windowsDevicePinHintEnabled)
      })
      setAdminMessage('Admin profile saved.')
    })
  }

  const handleSetAdminPin = async () => {
    setAdminError(null)
    setAdminMessage(null)
    const pin = adminPinDraft.trim()
    if (!/^[0-9]{4,32}$/.test(pin)) {
      setAdminError('PIN must be 4-32 numeric characters.')
      return
    }
    await runAction('admin-set-pin', async () => {
      await onSetAdminPin(pin)
      setAdminPinDraft('')
      setAdminMessage('Admin PIN saved securely on this device.')
    })
  }

  const handleVerifyAdminPin = async () => {
    setAdminError(null)
    setAdminMessage(null)
    const pin = adminVerifyPinDraft.trim()
    if (!pin) {
      setAdminError('Enter PIN to verify.')
      return
    }
    await runAction('admin-verify-pin', async () => {
      const result = await onVerifyAdminPin(pin)
      if (!result.ok) {
        setAdminError('PIN check failed.')
        return
      }
      setAdminMessage('PIN verified.')
      setAdminVerifyPinDraft('')
    })
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
      const manifest = parseThemeManifestJson(themeManifestJson)
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
        <div className="flex flex-wrap gap-2 border-b border-line/20 pb-3">
          {([
            ['general', 'General'],
            ['plugins', 'Plugins'],
            ['themes', 'Themes'],
            ['admin', 'Admin']
          ] as const).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={activeSection === value ? 'primary' : 'secondary'}
            onClick={() => setActiveSection(value)}
          >
            {label}
          </Button>
        ))}
      </div>
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
              <HelpTooltip text="Choose reading fonts, font size, and either a built-in preset or an installed custom theme." />
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
                  value={themePresetSelectValue}
                  onChange={async (event) => {
                    const value = event.target.value
                    if (value.startsWith('theme:')) {
                      await onSetActiveMarketplaceTheme(value.slice('theme:'.length))
                      return
                    }
                    await onSetActiveMarketplaceTheme(null)
                    await applyAppearance({ themePreset: value.replace('preset:', '') as ThemePresetOption })
                  }}
                >
                  <optgroup label="Built-in presets">
                  {PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={`preset:${option.value}`}>
                      {option.label}
                    </option>
                  ))}
                  </optgroup>
                  {marketplaceState.themes.length > 0 && (
                    <optgroup label="Custom themes">
                      {marketplaceState.themes.map((theme) => (
                        <option key={theme.id} value={`theme:${theme.id}`}>
                          {theme.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
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
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Marketplace Source
              <HelpTooltip text="Use the deployed marketplace site when it is ready, or localhost while developing." />
            </h3>
            {marketplaceError && (
              <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                {marketplaceError}
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Marketplace URL</span>
              <input
                value={marketplaceUrlDraft}
                onChange={(event) => setMarketplaceUrlDraft(event.target.value)}
                placeholder="https://your-marketplace.vercel.app/"
                className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 outline-none focus:border-accent/10"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={busyKey === 'marketplace-url-save'}
                onClick={() =>
                  runAction('marketplace-url-save', async () => {
                    await onMarketplaceBaseUrlChange(marketplaceUrlDraft)
                  })
                }
              >
                Save URL
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'marketplace-url-reset'}
                onClick={() =>
                  runAction('marketplace-url-reset', async () => {
                    setMarketplaceUrlDraft(defaultMarketplaceBaseUrl)
                    await onMarketplaceBaseUrlChange(defaultMarketplaceBaseUrl)
                  })
                }
              >
                Use default
              </Button>
            </div>
            <p className="text-xs text-muted">Default: {defaultMarketplaceBaseUrl}</p>
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
              Import from marketplace URL, paste JSON, load a local file/folder, then edit or export safely.
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
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'plugin-import-file'}
                onClick={async () =>
                  runAction('plugin-import-file', async () => {
                    await onImportPluginManifestFile()
                  })
                }
              >
                Import JSON File
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'plugin-import-folder'}
                onClick={async () =>
                  runAction('plugin-import-folder', async () => {
                    await onImportPluginFromFolder()
                  })
                }
              >
                Import Local Folder
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-xs outline-none focus:border-accent/10"
                placeholder="Marketplace plugin code (amp-plugin:...)"
                value={pluginMarketplaceCode}
                onChange={(event) => setPluginMarketplaceCode(event.target.value)}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'plugin-import-code'}
                onClick={async () =>
                  loadManifestFromCode('plugin-import-code', pluginMarketplaceCode, 'plugin', (payload) => {
                    setPluginManifestJson(payload)
                    setEditingPluginId(null)
                  })
                }
              >
                Load Code
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
                    const manifest = parsePluginManifestJson(pluginManifestJson)
                    await onRegisterPlugin(manifest)
                    setPluginManifestJson('')
                    setEditingPluginId(null)
                  })
                }
              >
                {editingPluginId ? 'Update Plugin Manifest' : 'Save Plugin Manifest'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'plugin-copy-code'}
                onClick={async () =>
                  runAction('plugin-copy-code', async () => {
                    await copyMarketplaceCode('plugin', pluginManifestJson)
                  })
                }
              >
                Copy Code
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
                      {plugin.credits?.name ? (
                        <p className="text-xs text-muted">Credits: {plugin.credits.name}</p>
                      ) : null}
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
                        variant="secondary"
                        disabled={busyKey === `plugin-export-${plugin.id}`}
                        onClick={async () =>
                          runAction(`plugin-export-${plugin.id}`, async () => {
                            await onExportPluginManifest(plugin.id)
                          })
                        }
                      >
                        Export File
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

      {showAdmin && (
        <section className="space-y-4 rounded-xl border border-line/20 bg-surface2 p-4">
          <div>
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Admin
              <HelpTooltip text="Manage creator identity, credit metadata, and local admin security controls." />
            </h3>
            <p className="mt-1 text-sm text-muted">
              Credits from this profile are embedded in prompt exports and manifest exports.
            </p>
          </div>

          {adminError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {adminError}
            </div>
          )}
          {adminMessage && (
            <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
              {adminMessage}
            </div>
          )}

          <article className="space-y-3 rounded-lg border border-line/20 bg-surface p-3">
            <p className="text-sm font-semibold">Creator Profile</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted">Display name</span>
                <input
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  value={adminDraft.displayName ?? ''}
                  onChange={(event) => setAdminDraft((current) => ({ ...current, displayName: event.target.value }))}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted">Avatar URL (optional)</span>
                <input
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  placeholder="https://..."
                  value={adminDraft.avatarUrl ?? ''}
                  onChange={(event) => setAdminDraft((current) => ({ ...current, avatarUrl: event.target.value }))}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted">GitHub</span>
                <input
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  placeholder="https://github.com/..."
                  value={adminDraft.socials?.github ?? ''}
                  onChange={(event) =>
                    setAdminDraft((current) => ({
                      ...current,
                      socials: { ...(current.socials ?? {}), github: event.target.value }
                    }))
                  }
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted">X / Twitter</span>
                <input
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  placeholder="https://x.com/..."
                  value={adminDraft.socials?.x ?? ''}
                  onChange={(event) =>
                    setAdminDraft((current) => ({
                      ...current,
                      socials: { ...(current.socials ?? {}), x: event.target.value }
                    }))
                  }
                />
              </label>
              <label className="block text-xs md:col-span-2">
                <span className="mb-1 block font-medium text-muted">Website</span>
                <input
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  placeholder="https://..."
                  value={adminDraft.socials?.website ?? ''}
                  onChange={(event) =>
                    setAdminDraft((current) => ({
                      ...current,
                      socials: { ...(current.socials ?? {}), website: event.target.value }
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" disabled={busyKey === 'admin-save-profile'} onClick={handleSaveAdminProfile}>
                Save Admin Profile
              </Button>
            </div>
          </article>

          <article className="space-y-3 rounded-lg border border-line/20 bg-surface p-3">
            <p className="text-sm font-semibold">Security</p>
            <p className="text-xs text-muted">
              Configure a local Admin PIN for sensitive actions. This PIN is stored securely per profile on this device.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted">Set Admin PIN</span>
                <input
                  type="password"
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  placeholder="4-32 digits"
                  value={adminPinDraft}
                  onChange={(event) => setAdminPinDraft(event.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted">Verify PIN</span>
                <input
                  type="password"
                  className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/20"
                  placeholder="Enter PIN to verify"
                  value={adminVerifyPinDraft}
                  onChange={(event) => setAdminVerifyPinDraft(event.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" disabled={busyKey === 'admin-set-pin'} onClick={handleSetAdminPin}>
                Save PIN
              </Button>
              <Button size="sm" variant="secondary" disabled={busyKey === 'admin-verify-pin'} onClick={handleVerifyAdminPin}>
                Verify PIN
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busyKey === 'admin-clear-pin'}
                onClick={async () =>
                  runAction('admin-clear-pin', async () => {
                    await onClearAdminPin()
                    setAdminMessage('Admin PIN removed.')
                  })
                }
              >
                Clear PIN
              </Button>
              <label className="inline-flex items-center gap-2 rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={Boolean(adminProfile?.security.windowsDevicePinHintEnabled)}
                  onChange={async (event) => {
                    await onSaveAdminProfile({
                      displayName: adminDraft.displayName ?? adminProfile?.displayName ?? 'AMP User',
                      avatarUrl: adminDraft.avatarUrl,
                      socials: adminDraft.socials,
                      windowsDevicePinHintEnabled: event.target.checked
                    })
                    setAdminMessage('Windows device PIN hint preference updated.')
                  }}
                />
                Use Windows device PIN hint for admin actions
              </label>
            </div>
            <p className="text-xs text-muted">
              PIN configured: {adminProfile?.security.hasAdminPin ? 'Yes' : 'No'}
            </p>
          </article>
        </section>
      )}

      {showThemes && (
        <section className="space-y-4 rounded-xl border border-line/20 bg-surface2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
                Installed Themes
                <HelpTooltip text="Themes installed from the AMP Marketplace or imported locally appear here." />
              </h3>
              <p className="mt-1 text-sm text-muted">
                Activate, export, open, or remove installed themes. Use Customize Themes only when you want to build or edit theme tokens.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setActiveSection('customizeThemes')}>
              Customize Themes
            </Button>
          </div>

          {marketplaceState.themes.length === 0 ? (
            <article className="rounded-lg border border-line/20 bg-surface p-4">
              <p className="text-sm font-medium">No themes installed yet.</p>
              <p className="mt-1 text-sm text-muted">
                Install a theme from the AMP Marketplace and it will show up here.
              </p>
            </article>
          ) : (
            <div className="space-y-2">
              {marketplaceState.themes.map((themeItem) => {
                const isActive = marketplaceState.activeThemeId === themeItem.id
                return (
                  <article
                    key={themeItem.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line/20 bg-surface p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {themeItem.name} <span className="text-muted">v{themeItem.version}</span>
                      </p>
                      <p className="text-xs text-muted">{themeItem.id}</p>
                      {isActive ? <p className="mt-1 text-xs font-medium text-success">Active theme</p> : null}
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
                          setActiveSection('customizeThemes')
                        }}
                      >
                        Customize
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
                        variant="secondary"
                        disabled={busyKey === `theme-export-${themeItem.id}`}
                        onClick={async () =>
                          runAction(`theme-export-${themeItem.id}`, async () => {
                            await onExportThemeManifest(themeItem.id)
                          })
                        }
                      >
                        Export File
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
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {showCustomizeThemes && (
        <section className="space-y-4 rounded-xl border border-line/20 bg-surface2 p-4">
          <div>
            <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
              Customize Themes
              <HelpTooltip text="Create, edit, activate, and share themes." />
            </h3>
            <p className="mt-1 text-sm text-muted">
              Import from a marketplace code, paste JSON, or load a local folder, then use the builder to refine visuals.
            </p>
            <Button className="mt-3" size="sm" variant="secondary" onClick={() => setActiveSection('themes')}>
              Back to Installed Themes
            </Button>
          </div>

          {marketplaceError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {marketplaceError}
            </div>
          )}

          <article className="grid gap-4 rounded-lg border border-line/20 bg-surface p-3 xl:grid-cols-[minmax(420px,0.65fr)_minmax(980px,1.7fr)] 2xl:grid-cols-[minmax(460px,0.55fr)_minmax(1180px,1.9fr)]">
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
                <div className="grid gap-2 md:grid-cols-2">
                  {([
                    ['fontSizeBase', 'Base font size'],
                    ['lineHeightBody', 'Body line height'],
                    ['lineHeightTight', 'Heading line height'],
                    ['letterSpacingHeading', 'Heading letter spacing'],
                    ['letterSpacingMeta', 'Meta letter spacing'],
                    ['fontWeightRegular', 'Regular weight'],
                    ['fontWeightMedium', 'Medium weight'],
                    ['fontWeightSemibold', 'Semibold weight']
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="mb-1 block font-medium text-muted">{label}</span>
                      <input
                        className="h-9 w-full border border-line/20 bg-surface2 px-2 font-mono outline-none focus:border-accent/10"
                        value={themeBuilder[key]}
                        onChange={(event) => setThemeBuilder((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              </details>

              <details open className="space-y-2">
                <summary className="cursor-pointer text-sm font-semibold">Layout, Effects & Notifications</summary>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Primary radius</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      className="w-full accent-accent"
                      value={Number.parseFloat(themeBuilder.radius)}
                      onChange={(event) =>
                        setThemeBuilder((current) => ({
                          ...current,
                          radius: `${event.target.value}rem`,
                          radiusMd: `${event.target.value}rem`
                        }))
                      }
                    />
                    <span className="w-14 text-right font-mono text-[10px] text-muted">{themeBuilder.radius}</span>
                  </div>
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {([
                    ['radiusSm', 'Radius small'],
                    ['radiusMd', 'Radius medium'],
                    ['radiusLg', 'Radius large'],
                    ['radiusXl', 'Radius extra large'],
                    ['controlHeightSm', 'Small control height'],
                    ['controlHeightMd', 'Medium control height'],
                    ['controlPaddingX', 'Control horizontal padding'],
                    ['panelPadding', 'Panel padding'],
                    ['panelGap', 'Panel gap'],
                    ['sidebarWidth', 'Sidebar width'],
                    ['scrollbarSize', 'Scrollbar size'],
                    ['focusOutlineWidth', 'Focus outline width']
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="mb-1 block font-medium text-muted">{label}</span>
                      <input
                        className="h-9 w-full border border-line/20 bg-surface2 px-2 font-mono outline-none focus:border-accent/10"
                        value={themeBuilder[key]}
                        onChange={(event) => setThemeBuilder((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted">Shadow</span>
                  <input
                    className="h-9 w-full border border-line/20 bg-surface2 px-2 font-mono outline-none focus:border-accent/10"
                    value={themeBuilder.shadow}
                    onChange={(event) => setThemeBuilder((current) => ({ ...current, shadow: event.target.value }))}
                  />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  {([
                    ['ambientA', 'Ambient glow A'],
                    ['ambientB', 'Ambient glow B'],
                    ['ambientOverlay', 'Ambient overlay'],
                    ['toastBg', 'Toast background'],
                    ['toastText', 'Toast text'],
                    ['toastMuted', 'Toast muted text'],
                    ['toastBorder', 'Toast border']
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="mb-1 block font-medium text-muted">{label}</span>
                      <input
                        className="h-9 w-full border border-line/20 bg-surface2 px-2 font-mono outline-none focus:border-accent/10"
                        value={themeBuilder[key]}
                        onChange={(event) => setThemeBuilder((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
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

              <div className="grid min-h-[520px] gap-3 xl:grid-cols-[220px_minmax(300px,0.8fr)_minmax(460px,1.4fr)] 2xl:grid-cols-[240px_minmax(360px,0.85fr)_minmax(560px,1.55fr)]">
                <aside
                  className="flex flex-col overflow-hidden border"
                  style={{
                    background: builderColors['--surface'],
                    borderColor: builderColors['--border'],
                    borderRadius: themeBuilder.radius,
                    boxShadow: themeBuilder.shadow
                  }}
                >
                  <div className="border-b p-3" style={{ borderColor: builderColors['--border'] }}>
                    <p className="text-sm font-semibold">AMP</p>
                    <p className="mono-meta mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: builderColors['--text-muted'] }}>
                      All My Prompts
                    </p>
                    <button
                      type="button"
                      className="mt-3 h-8 w-full text-xs font-semibold"
                      style={{
                        background: builderColors['--accent'],
                        color: builderColors['--accent-contrast'],
                        borderRadius: themeBuilder.radius
                      }}
                    >
                      New Prompt
                    </button>
                  </div>
                  <div className="space-y-1 p-3 text-xs">
                    {['All prompts', 'Ready', 'Drafting', 'Templates'].map((item, index) => (
                      <div
                        key={item}
                        className="flex items-center justify-between px-2 py-1.5"
                        style={{
                          background: index === 0 ? builderColors['--surface-2'] : 'transparent',
                          borderRadius: themeBuilder.radius,
                          color: index === 0 ? builderColors['--text'] : builderColors['--text-muted']
                        }}
                      >
                        <span>{item}</span>
                        {index < 3 && <span style={{ color: builderColors['--text-muted'] }}>{[12, 8, 4][index]}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto border-t p-3 text-xs" style={{ borderColor: builderColors['--border'] }}>
                    {['Share / Import', 'Marketplace', 'Settings'].map((item) => (
                      <div key={item} className="px-2 py-1.5" style={{ color: builderColors['--text-muted'] }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>

                <section
                  className="flex flex-col overflow-hidden border"
                  style={{
                    background: builderColors['--surface'],
                    borderColor: builderColors['--border'],
                    borderRadius: themeBuilder.radius,
                    boxShadow: themeBuilder.shadow
                  }}
                >
                  <div className="border-b p-3" style={{ borderColor: builderColors['--border'] }}>
                    <div
                      className="flex h-9 items-center gap-2 px-2 text-xs"
                      style={{
                        background: builderColors['--surface-2'],
                        border: `1px solid ${builderColors['--border']}`,
                        borderRadius: themeBuilder.radius,
                        color: builderColors['--text-muted']
                      }}
                    >
                      Search prompts...
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    {['Marketplace launch copy', 'Theme install flow', 'Admin dashboard notes'].map((item, index) => (
                      <article
                        key={item}
                        className="p-3 text-xs"
                        style={{
                          background: index === 0 ? builderColors['--surface-2'] : builderColors['--surface'],
                          border: `1px solid ${index === 0 ? builderColors['--ring'] : builderColors['--border']}`,
                          borderRadius: themeBuilder.radius
                        }}
                      >
                        <p className="font-semibold" style={{ fontFamily: themeBuilder.fontSerif }}>{item}</p>
                        <p className="mt-1" style={{ color: builderColors['--text-muted'] }}>
                          Prompt preview, tags, quality score, and metadata.
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          {['amp', 'theme'].map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px]"
                              style={{
                                background: builderColors['--surface'],
                                border: `1px solid ${builderColors['--border']}`,
                                borderRadius: themeBuilder.radius,
                                color: builderColors['--text-muted']
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section
                  className="flex flex-col overflow-hidden border"
                  style={{
                    background: builderColors['--surface'],
                    borderColor: builderColors['--border'],
                    borderRadius: themeBuilder.radius,
                    boxShadow: themeBuilder.shadow
                  }}
                >
                  <div className="flex items-center justify-between border-b p-3" style={{ borderColor: builderColors['--border'] }}>
                    <div>
                      <p className="text-lg font-semibold" style={{ fontFamily: themeBuilder.fontSerif }}>Theme install flow</p>
                      <p className="text-xs" style={{ color: builderColors['--text-muted'] }}>
                        Editor, fields, status states, and themed prompts.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="h-8 px-3 text-xs font-semibold"
                      style={{
                        background: builderColors['--accent'],
                        color: builderColors['--accent-contrast'],
                        borderRadius: themeBuilder.radius
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <div className="grid gap-3 p-3 md:grid-cols-[1fr_170px]">
                    <div className="space-y-3">
                      <label className="block text-xs">
                        <span className="mb-1 block font-semibold">Prompt title</span>
                        <input
                          readOnly
                          value="Theme install flow"
                          className="h-9 w-full px-2"
                          style={{
                            background: builderColors['--input'],
                            border: `1px solid ${builderColors['--ring']}`,
                            borderRadius: themeBuilder.radius,
                            color: builderColors['--text']
                          }}
                        />
                      </label>
                      <div
                        className="min-h-28 p-3 text-xs leading-5"
                        style={{
                          background: builderColors['--input'],
                          border: `1px solid ${builderColors['--border']}`,
                          borderRadius: themeBuilder.radius,
                          color: builderColors['--text']
                        }}
                      >
                        Write a clear installation prompt that confirms the theme was added, then asks whether to make it active.
                      </div>
                      <div
                        className="p-3 text-xs"
                        style={{
                          background: builderColors['--popover'],
                          color: builderColors['--popover-foreground'],
                          border: `1px solid ${builderColors['--border']}`,
                          borderRadius: themeBuilder.radius
                        }}
                      >
                        Themed popover: make this your active theme?
                      </div>
                    </div>
                    <div className="space-y-2">
                      {([
                        ['--success', 'Installed', 'Theme added to Settings.'],
                        ['--warning', 'Review', 'Manifest needs screenshot.'],
                        ['--danger', 'Remove', 'Delete marketplace theme.']
                      ] as const).map(([token, label, text]) => (
                        <div
                          key={token}
                          className="p-2 text-xs"
                          style={{
                            background: `${builderColors[token]}22`,
                            border: `1px solid ${builderColors[token]}`,
                            borderRadius: themeBuilder.radius
                          }}
                        >
                          <p className="font-semibold" style={{ color: builderColors[token] }}>{label}</p>
                          <p className="mt-1" style={{ color: builderColors['--text-muted'] }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
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
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'theme-import-file'}
                onClick={async () =>
                  runAction('theme-import-file', async () => {
                    await onImportThemeManifestFile()
                  })
                }
              >
                Import JSON File
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'theme-import-folder'}
                onClick={async () =>
                  runAction('theme-import-folder', async () => {
                    await onImportThemeFromFolder()
                  })
                }
              >
                Import Local Folder
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                className="h-9 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-xs outline-none focus:border-accent/10"
                placeholder="Marketplace theme code (amp-theme:...)"
                value={themeMarketplaceCode}
                onChange={(event) => setThemeMarketplaceCode(event.target.value)}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'theme-import-code'}
                onClick={async () =>
                  loadManifestFromCode('theme-import-code', themeMarketplaceCode, 'theme', (payload) => {
                    setThemeManifestJson(payload)
                    setEditingThemeId(null)
                  })
                }
              >
                Load Code
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
                    const manifest = parseThemeManifestJson(themeManifestJson)
                    await onRegisterTheme(manifest)
                    setThemeManifestJson('')
                    setEditingThemeId(null)
                  })
                }
              >
                {editingThemeId ? 'Update Theme' : 'Save Theme'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyKey === 'theme-copy-code'}
                onClick={async () =>
                  runAction('theme-copy-code', async () => {
                    await copyMarketplaceCode('theme', themeManifestJson)
                  })
                }
              >
                Copy Code
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

          {false && (
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
                        {themeItem.credits?.name ? (
                          <p className="text-xs text-muted">Credits: {themeItem.credits.name}</p>
                        ) : null}
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
                          variant="secondary"
                          disabled={busyKey === `theme-export-${themeItem.id}`}
                          onClick={async () =>
                            runAction(`theme-export-${themeItem.id}`, async () => {
                              await onExportThemeManifest(themeItem.id)
                            })
                          }
                        >
                          Export File
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
          )}
        </section>
      )}
    </div>
  )

  if (asPage) {
    return <section className="mx-auto w-full max-w-[1800px]">{body}</section>
  }

  return (
    <Modal open={open} onClose={onClose ?? (() => undefined)} title="Settings" widthClass="max-w-[98vw]">
      {body}
    </Modal>
  )
}
