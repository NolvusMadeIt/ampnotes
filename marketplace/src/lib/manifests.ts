import type { ListingKind } from './types'

const pluginWordCount = {
  id: 'plugin.wordcount-pro',
  name: 'Word Count Pro',
  version: '1.1.0',
  description: 'Live word and character counters inside AMP prompt editor.',
  author: 'NolvusMadeIt',
  entry: 'plugins/wordcount-pro/index.js',
  homepage: 'https://nolvusmadeit.gumroad.com',
  permissions: ['prompt.read', 'template.read']
}

const pluginPromptLinter = {
  id: 'plugin.prompt-linter',
  name: 'Prompt Linter',
  version: '2.0.0',
  description: 'Lint rules for missing role, target model, and weak constraints.',
  author: 'NolvusMadeIt',
  entry: 'plugins/prompt-linter/index.js',
  homepage: 'https://nolvusmadeit.gumroad.com',
  permissions: ['prompt.read', 'prompt.write', 'template.read']
}

const pluginExportBundler = {
  id: 'plugin.export-bundler',
  name: 'Export Bundler',
  version: '1.0.5',
  description: 'Bundle selected prompts/templates into one distributable package.',
  author: 'NolvusMadeIt',
  entry: 'plugins/export-bundler/index.js',
  homepage: 'https://nolvusmadeit.gumroad.com',
  permissions: ['prompt.read', 'template.read', 'share.write']
}

const themeMidnightInk = {
  id: 'theme.midnight-ink',
  name: 'Midnight Ink',
  version: '1.3.0',
  author: 'NolvusMadeIt',
  description: 'Deep navy theme tuned for long writing sessions.',
  tokens: {
    light: {
      '--bg': '#f7f8fb',
      '--surface': '#ffffff',
      '--text': '#101114',
      '--border': '#d9dde5'
    },
    dark: {
      '--bg': '#080b14',
      '--surface': '#0f1524',
      '--text': '#e8edf7',
      '--border': '#1d2a43'
    }
  }
}

const themePaperGrid = {
  id: 'theme.paper-grid',
  name: 'Paper Grid',
  version: '1.0.2',
  author: 'NolvusMadeIt',
  description: 'Warm paper palette with crisp controls and subtle panels.',
  tokens: {
    light: {
      '--bg': '#f6f1e7',
      '--surface': '#fffaf2',
      '--text': '#2a251d',
      '--border': '#d9cdb7'
    },
    dark: {
      '--bg': '#17120d',
      '--surface': '#241d15',
      '--text': '#f0e6d6',
      '--border': '#574532'
    }
  }
}

const themeStudioLight = {
  id: 'theme.studio-light',
  name: 'Studio Light',
  version: '1.0.0',
  author: 'NolvusMadeIt',
  description: 'Neutral productivity theme inspired by modern app dashboards.',
  tokens: {
    light: {
      '--bg': '#f6f8fb',
      '--surface': '#ffffff',
      '--text': '#0f1520',
      '--border': '#d8dee7'
    },
    dark: {
      '--bg': '#0b1018',
      '--surface': '#151c28',
      '--text': '#e8edf5',
      '--border': '#273244'
    }
  }
}

const pluginMap: Record<string, object> = {
  'plugin.wordcount-pro': pluginWordCount,
  'plugin.prompt-linter': pluginPromptLinter,
  'plugin.export-bundler': pluginExportBundler
}

const themeMap: Record<string, object> = {
  'theme.midnight-ink': themeMidnightInk,
  'theme.paper-grid': themePaperGrid,
  'theme.studio-light': themeStudioLight
}

export function getManifest(kind: ListingKind, id: string): object | null {
  if (kind === 'plugin') {
    return pluginMap[id] ?? null
  }
  return themeMap[id] ?? null
}
