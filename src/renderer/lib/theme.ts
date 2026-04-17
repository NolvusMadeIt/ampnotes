import type { AppearanceSettingsDTO, ThemeMode, ThemeTokenMap } from '@shared/types'

const MARKETPLACE_THEME_KEYS_ATTR = 'data-marketplace-theme-keys'
const PRESET_THEME_KEYS_ATTR = 'data-preset-theme-keys'

const FONT_MAP: Record<AppearanceSettingsDTO['fontFamily'], string> = {
  merriweather: "'Merriweather', 'Source Serif 4', Georgia, serif",
  sourceSerif: "'Source Serif 4', 'Merriweather', Georgia, serif",
  lora: "'Lora', 'Merriweather', Georgia, serif",
  ibmPlexSans: "'IBM Plex Sans', 'Inter', 'Segoe UI', sans-serif",
  publicSans: "'Public Sans', 'Inter', 'Segoe UI', sans-serif"
}

const PRESET_OVERRIDES: Record<
  AppearanceSettingsDTO['themePreset'],
  Record<'light' | 'dark', Record<string, string>>
> = {
  midnight: {
    light: {
      '--bg': '#f5f7fb',
      '--surface': '#ffffff',
      '--surface-2': '#f1f4f8',
      '--text': '#11151d',
      '--text-muted': '#5d687a',
      '--border': '#a4afc0',
      '--accent': '#4d7bff'
    },
    dark: {
      '--bg': '#090d14',
      '--surface': '#0f141d',
      '--surface-2': '#141a26',
      '--text': '#e7edf8',
      '--text-muted': '#99a8bc',
      '--border': '#1d2634',
      '--accent': '#6b8dff'
    }
  },
  ocean: {
    light: {
      '--bg': '#f4f8fc',
      '--surface': '#ffffff',
      '--surface-2': '#eff4fb',
      '--text': '#11151d',
      '--text-muted': '#5b6b82',
      '--border': '#9eb0c7',
      '--accent': '#3c7cdd'
    },
    dark: {
      '--bg': '#08131d',
      '--surface': '#0e1b28',
      '--surface-2': '#132334',
      '--text': '#e4eefb',
      '--text-muted': '#97a9c2',
      '--border': '#1b3146',
      '--accent': '#4f8fe3'
    }
  },
  graphite: {
    light: {
      '--bg': '#f3f4f6',
      '--surface': '#fbfcfd',
      '--surface-2': '#eceff3',
      '--text': '#12151b',
      '--text-muted': '#5f6673',
      '--border': '#9fa8b5',
      '--accent': '#5d6b80'
    },
    dark: {
      '--bg': '#0f1115',
      '--surface': '#16191f',
      '--surface-2': '#1c2129',
      '--text': '#e8ebf2',
      '--text-muted': '#9da6b3',
      '--border': '#252b35',
      '--accent': '#7e8da5'
    }
  },
  forest: {
    light: {
      '--bg': '#f2f7f3',
      '--surface': '#fbfdfb',
      '--surface-2': '#eaf2ec',
      '--text': '#131a14',
      '--text-muted': '#5e6e61',
      '--border': '#9fb2a3',
      '--accent': '#3f8a5b'
    },
    dark: {
      '--bg': '#0d1510',
      '--surface': '#142019',
      '--surface-2': '#182a20',
      '--text': '#e5efe7',
      '--text-muted': '#9fb4a5',
      '--border': '#223128',
      '--accent': '#56a879'
    }
  },
  sand: {
    light: {
      '--bg': '#f8f3ea',
      '--surface': '#fffaf4',
      '--surface-2': '#f2e9dc',
      '--text': '#1a1510',
      '--text-muted': '#6f6253',
      '--border': '#bea98f',
      '--accent': '#ae7446'
    },
    dark: {
      '--bg': '#17120d',
      '--surface': '#221b14',
      '--surface-2': '#2b2219',
      '--text': '#eee3d5',
      '--text-muted': '#b8a58d',
      '--border': '#362b20',
      '--accent': '#c98854'
    }
  }
}

export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

function clearMarketplaceThemeOverrides(root: HTMLElement): void {
  const raw = root.getAttribute(MARKETPLACE_THEME_KEYS_ATTR)
  if (!raw) {
    return
  }

  for (const key of raw.split('|').map((item) => item.trim()).filter(Boolean)) {
    root.style.removeProperty(key)
  }
  root.removeAttribute(MARKETPLACE_THEME_KEYS_ATTR)
}

function clearPresetOverrides(root: HTMLElement): void {
  const raw = root.getAttribute(PRESET_THEME_KEYS_ATTR)
  if (!raw) {
    return
  }

  for (const key of raw.split('|').map((item) => item.trim()).filter(Boolean)) {
    root.style.removeProperty(key)
  }
  root.removeAttribute(PRESET_THEME_KEYS_ATTR)
}

function applyMarketplaceThemeOverrides(
  root: HTMLElement,
  resolvedTheme: 'light' | 'dark',
  tokens?: ThemeTokenMap
): void {
  const selected = (resolvedTheme === 'dark' ? tokens?.dark : tokens?.light) ?? {}
  const keys: string[] = []

  for (const [name, value] of Object.entries(selected)) {
    const token = name.startsWith('--') ? name : `--${name}`
    // Keep border color controlled by app presets to avoid bright/white outline themes.
    if (token === '--border') {
      continue
    }
    const nextValue = value.trim()
    if (!nextValue) {
      continue
    }
    root.style.setProperty(token, nextValue)
    keys.push(token)
  }

  if (keys.length > 0) {
    root.setAttribute(MARKETPLACE_THEME_KEYS_ATTR, keys.join('|'))
  }
}

export function applyTheme(theme: ThemeMode, customTokens?: ThemeTokenMap): void {
  const resolved = resolveTheme(theme)
  const root = document.documentElement

  root.setAttribute('data-theme', resolved)
  clearMarketplaceThemeOverrides(root)
  applyMarketplaceThemeOverrides(root, resolved, customTokens)
}

export function applyAppearance(appearance: AppearanceSettingsDTO, resolvedTheme: 'light' | 'dark'): void {
  const root = document.documentElement
  const fontFamily = FONT_MAP[appearance.fontFamily] ?? FONT_MAP.merriweather
  root.style.setProperty('--font-sans', fontFamily)
  root.style.setProperty('--font-size-base', `${Math.round(appearance.fontScale)}%`)

  clearPresetOverrides(root)
  const presetTokens = PRESET_OVERRIDES[appearance.themePreset]?.[resolvedTheme] ?? {}
  const keys: string[] = []
  for (const [token, value] of Object.entries(presetTokens)) {
    root.style.setProperty(token, value)
    keys.push(token)
  }
  if (keys.length > 0) {
    root.setAttribute(PRESET_THEME_KEYS_ATTR, keys.join('|'))
  }
}
