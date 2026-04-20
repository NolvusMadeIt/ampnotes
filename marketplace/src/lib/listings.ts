import type { ListingItem } from './types'

export const LISTINGS: ListingItem[] = [
  {
    id: 'plugin.wordcount-pro',
    slug: 'wordcount-pro',
    kind: 'plugin',
    tier: 'free',
    title: 'Word Count Pro',
    shortDescription: 'Live word and character counters inside AMP prompt editor.',
    fullDescription:
      'Adds a real-time count widget for words and characters with template placeholders like {wordcount}. Built for prompt writers who need quick readability checks without leaving AMP.',
    tags: ['editor', 'metrics', 'writing'],
    version: '1.1.0',
    compatibility: 'AMP >= 0.1.0',
    updatedAt: '2026-04-18',
    author: 'NolvusMadeIt',
    manifestId: 'plugin.wordcount-pro',
    downloads: 1642,
    rating: 4.8,
    featured: true
  },
  {
    id: 'plugin.prompt-linter',
    slug: 'prompt-linter',
    kind: 'plugin',
    tier: 'paid',
    title: 'Prompt Linter',
    shortDescription: 'Lint rules for missing role, target model, and weak constraints.',
    fullDescription:
      'Runs configurable quality rules on prompts before save/share/export. Great for teams that need consistent style and fewer vague instructions in production prompts.',
    tags: ['quality', 'validation', 'teams'],
    version: '2.0.0',
    compatibility: 'AMP >= 0.1.0',
    updatedAt: '2026-04-16',
    author: 'NolvusMadeIt',
    manifestId: 'plugin.prompt-linter',
    gumroadUrl: 'https://nolvusmadeit.gumroad.com',
    priceCents: 1200,
    downloads: 431,
    rating: 4.9,
    featured: true
  },
  {
    id: 'theme.midnight-ink',
    slug: 'midnight-ink',
    kind: 'theme',
    tier: 'free',
    title: 'Midnight Ink',
    shortDescription: 'Deep navy theme tuned for long writing sessions.',
    fullDescription:
      'A high-contrast editorial dark theme with muted borders and readable heading hierarchy. Designed to match AMP desktop default styling and reduce visual noise.',
    tags: ['dark', 'editorial', 'focus'],
    version: '1.3.0',
    compatibility: 'AMP >= 0.1.0',
    updatedAt: '2026-04-15',
    author: 'NolvusMadeIt',
    manifestId: 'theme.midnight-ink',
    downloads: 2134,
    rating: 4.7,
    featured: true
  },
  {
    id: 'theme.paper-grid',
    slug: 'paper-grid',
    kind: 'theme',
    tier: 'paid',
    title: 'Paper Grid',
    shortDescription: 'Warm paper palette with crisp controls and subtle panels.',
    fullDescription:
      'Built for creators who prefer a softer canvas with premium typography and a clean control layer. Includes tuned chart/status colors for settings and analytics views.',
    tags: ['light', 'paper', 'premium'],
    version: '1.0.2',
    compatibility: 'AMP >= 0.1.0',
    updatedAt: '2026-04-12',
    author: 'NolvusMadeIt',
    manifestId: 'theme.paper-grid',
    gumroadUrl: 'https://nolvusmadeit.gumroad.com',
    priceCents: 900,
    downloads: 219,
    rating: 4.8
  },
  {
    id: 'plugin.export-bundler',
    slug: 'export-bundler',
    kind: 'plugin',
    tier: 'free',
    title: 'Export Bundler',
    shortDescription: 'Bundle selected prompts/templates into one distributable package.',
    fullDescription:
      'Extends AMP export workflow with profile-aware bundle presets for client handoff packs, team packs, and release-note snapshots.',
    tags: ['export', 'bundles', 'workflow'],
    version: '1.0.5',
    compatibility: 'AMP >= 0.1.0',
    updatedAt: '2026-04-09',
    author: 'NolvusMadeIt',
    manifestId: 'plugin.export-bundler',
    downloads: 903,
    rating: 4.6
  },
  {
    id: 'theme.studio-light',
    slug: 'studio-light',
    kind: 'theme',
    tier: 'free',
    title: 'Studio Light',
    shortDescription: 'Neutral productivity theme inspired by modern app dashboards.',
    fullDescription:
      'A practical light theme with broad compatibility and clean contrast across cards, forms, popovers, and tags.',
    tags: ['light', 'default', 'clean'],
    version: '1.0.0',
    compatibility: 'AMP >= 0.1.0',
    updatedAt: '2026-04-07',
    author: 'NolvusMadeIt',
    manifestId: 'theme.studio-light',
    downloads: 1188,
    rating: 4.5
  }
]
