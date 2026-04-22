import type { ApiClient } from '@preload/api-types'
import type {
  AdminProfileDTO,
  AdminProfileInput,
  CreatePluginManifestInput,
  CreateTemplateInput,
  CreateThemeManifestInput,
  CreatePromptInput,
  ImportConflictStrategy,
  ImportResult,
  AppearanceSettingsDTO,
  FontFamilyOption,
  InstalledPluginDTO,
  InstalledThemeDTO,
  MarketplaceStateDTO,
  ProfileDTO,
  PromptDTO,
  PromptListFilters,
  PromptVersionDTO,
  PromptDefaultView,
  RefinementRequest,
  RefinementResult,
  SelectedExportBundle,
  SessionDTO,
  SharePackageV1,
  TemplateDTO,
  ThemePresetOption,
  ThemeMode,
  UpdateTemplateInput,
  UpdatePromptInput
} from '@shared/types'
import {
  formatPromptValidationIssues,
  validatePromptForSave,
  validatePromptForShare
} from '@shared/validation/prompt'

interface BrowserDb {
  profiles: ProfileDTO[]
  sessions: SessionDTO[]
  prompts: PromptDTO[]
  versions: PromptVersionDTO[]
  themes: Record<string, ThemeMode>
  appearance: Record<string, AppearanceSettingsDTO>
  refineKeys: Record<string, string>
  templates: TemplateDTO[]
  marketplace: {
    plugins: InstalledPluginDTO[]
    themes: InstalledThemeDTO[]
    activeThemeId: string | null
  }
  adminProfiles: Record<string, AdminProfileDTO>
  adminPins: Record<string, string>
}

const STORAGE_KEY = 'ampnotes.browser.db.v1'
const SESSION_TTL_MS = 48 * 60 * 60 * 1000
const DEFAULT_APPEARANCE: AppearanceSettingsDTO = {
  fontFamily: 'merriweather',
  fontScale: 100,
  themePreset: 'midnight',
  defaultPromptView: 'read'
}

const DEFAULT_ADMIN_PROFILE: AdminProfileDTO = {
  displayName: 'AMP User',
  socials: {},
  security: {
    hasAdminPin: false,
    windowsDevicePinHintEnabled: false
  }
}

function normalizeAdminProfile(value: unknown, fallbackName = 'AMP User'): AdminProfileDTO {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_ADMIN_PROFILE, displayName: fallbackName }
  }
  const record = value as Record<string, unknown>
  const socialsRaw = (record.socials && typeof record.socials === 'object' ? record.socials : {}) as Record<
    string,
    unknown
  >
  const normalizeUrl = (input: unknown) =>
    typeof input === 'string' && input.trim().startsWith('https://') ? input.trim().slice(0, 200) : undefined
  return {
    displayName:
      typeof record.displayName === 'string' && record.displayName.trim()
        ? record.displayName.trim().slice(0, 80)
        : fallbackName,
    avatarUrl: normalizeUrl(record.avatarUrl),
    socials: {
      github: normalizeUrl(socialsRaw.github),
      x: normalizeUrl(socialsRaw.x),
      website: normalizeUrl(socialsRaw.website)
    },
    security: {
      hasAdminPin: Boolean((record.security as { hasAdminPin?: unknown } | undefined)?.hasAdminPin),
      windowsDevicePinHintEnabled: Boolean(
        (record.security as { windowsDevicePinHintEnabled?: unknown } | undefined)?.windowsDevicePinHintEnabled
      )
    }
  }
}

function hashBrowserPin(pin: string): string {
  const value = pin.trim()
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return `pin_${Math.abs(hash)}`
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

function normalizePromptDefaultView(value: unknown): PromptDefaultView {
  if (value === 'summary' || value === 'read' || value === 'edit') {
    return value
  }
  return DEFAULT_APPEARANCE.defaultPromptView
}

function normalizeAppearance(value: unknown): AppearanceSettingsDTO {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APPEARANCE }
  }
  const record = value as Record<string, unknown>
  const fontScaleRaw = Number(record.fontScale)
  const fontScale =
    Number.isFinite(fontScaleRaw) && fontScaleRaw >= 90 && fontScaleRaw <= 125
      ? Math.round(fontScaleRaw)
      : DEFAULT_APPEARANCE.fontScale

  return {
    fontFamily: normalizeFontFamily(record.fontFamily),
    fontScale,
    themePreset: normalizeThemePreset(record.themePreset),
    defaultPromptView: normalizePromptDefaultView(record.defaultPromptView)
  }
}

function nowIso() {
  return new Date().toISOString()
}

function isSessionExpired(session: SessionDTO): boolean {
  const signedInAtMs = Date.parse(session.signedInAt)
  if (!Number.isFinite(signedInAtMs)) {
    return true
  }
  return Date.now() - signedInAtMs > SESSION_TTL_MS
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function uniqueTags(tags: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.toLowerCase())
    )
  )
}

function nextDisplayOrder(prompts: PromptDTO[], profileId: string): number {
  const orders = prompts
    .filter((prompt) => prompt.profileId === profileId)
    .map((prompt) => prompt.displayOrder)
    .filter((order) => Number.isFinite(order))
  return (orders.length > 0 ? Math.min(...orders) : 0) - 1000
}

function normalizeTemplate(input: CreateTemplateInput | UpdateTemplateInput) {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    category: input.category?.trim() || undefined,
    tags: uniqueTags(input.tags)
  }
}

function normalizePluginManifest(input: CreatePluginManifestInput): CreatePluginManifestInput {
  const allowedPermissions = new Set([
    'prompt.read',
    'prompt.write',
    'template.read',
    'template.write',
    'share.export',
    'share.import',
    'theme.apply',
    'settings.read'
  ])
  const safePermissions = [...new Set((input.permissions ?? []).map((permission) => permission.trim()).filter(Boolean))]
    .filter((permission) => allowedPermissions.has(permission))

  const entry = input.entry?.trim()
  const safeEntry =
    entry && /^[a-z0-9_./-]+$/i.test(entry) && !entry.includes('..') ? entry : undefined

  return {
    ...input,
    id: input.id.trim(),
    name: input.name.trim(),
    version: input.version.trim(),
    description: input.description?.trim() || undefined,
    author: input.author?.trim() || undefined,
    entry: safeEntry,
    homepage: input.homepage?.trim().startsWith('https://') ? input.homepage.trim() : undefined,
    socials: input.socials,
    credits: input.credits,
    permissions: safePermissions
  }
}

function normalizeThemeManifest(input: CreateThemeManifestInput): CreateThemeManifestInput {
  const normalizeTokenMap = (map?: Record<string, string>) => {
    if (!map) {
      return undefined
    }
    const output: Record<string, string> = {}
    for (const [key, value] of Object.entries(map)) {
      const token = key.trim()
      const tokenValue = value.trim()
      if (!token || !tokenValue) {
        continue
      }
      const normalizedKey = token.startsWith('--') ? token : `--${token}`
      if (!/^--[a-z0-9-]+$/i.test(normalizedKey)) {
        continue
      }
      const lowerValue = tokenValue.toLowerCase()
      if (lowerValue.includes('url(') || lowerValue.includes('@import') || lowerValue.includes('expression(')) {
        continue
      }
      output[normalizedKey] = tokenValue.slice(0, 120)
    }
    return output
  }

  return {
    ...input,
    id: input.id.trim(),
    name: input.name.trim(),
    version: input.version.trim(),
    description: input.description?.trim() || undefined,
    author: input.author?.trim() || undefined,
    homepage: input.homepage?.trim().startsWith('https://') ? input.homepage.trim() : undefined,
    socials: input.socials,
    credits: input.credits,
    tokens: {
      light: normalizeTokenMap(input.tokens.light),
      dark: normalizeTokenMap(input.tokens.dark)
    }
  }
}

function decodeMarketplaceInstallCode(kind: 'plugin' | 'theme', rawCode: string): CreatePluginManifestInput | CreateThemeManifestInput {
  const expectedPrefix = kind === 'plugin' ? 'amp-plugin:' : 'amp-theme:'
  const trimmed = rawCode.trim()
  const payload = trimmed.startsWith(expectedPrefix) ? trimmed.slice(expectedPrefix.length).trim() : trimmed
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const manifest = JSON.parse(new TextDecoder().decode(bytes)) as CreatePluginManifestInput | CreateThemeManifestInput

  if (manifest.schemaVersion !== 1 || !manifest.compatibility || !manifest.screenshot || !manifest.checksum) {
    throw new Error('Marketplace code is missing required install metadata.')
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(manifest.checksum)) {
    throw new Error('Marketplace code has an invalid checksum.')
  }
  if (manifest.packageUrl) {
    if (!manifest.packageUrl.startsWith('https://') || !manifest.packageUrl.toLowerCase().split('?')[0].endsWith('.zip')) {
      throw new Error('Marketplace package URL must be an HTTPS .zip file.')
    }
    if (!manifest.packageChecksum || !/^sha256:[a-f0-9]{64}$/i.test(manifest.packageChecksum)) {
      throw new Error('Marketplace package must include a valid checksum.')
    }
  }
  if (kind === 'plugin' && !('entry' in manifest && manifest.entry)) {
    throw new Error('Plugin marketplace code is missing an entry file.')
  }
  if (kind === 'theme' && !('tokens' in manifest && manifest.tokens)) {
    throw new Error('Theme marketplace code is missing token data.')
  }

  return manifest
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

function summarizePrompt(content: string): string {
  const stripped = content.replace(/\s+/g, ' ').trim()
  return stripped.slice(0, 80)
}

function createDefaultTemplates(): TemplateDTO[] {
  return [
    {
      id: 'template_brief',
      scope: 'system',
      title: 'Prompt Brief',
      category: 'Planning',
      tags: ['brief', 'planning'],
      content: [
        'Role: You are an experienced [domain] specialist.',
        'Goal: Help me [specific outcome].',
        'Context: [what the model needs to know].',
        'Constraints: [limits, style, must/avoid].',
        'Output format:',
        '- [section 1]',
        '- [section 2]',
        '- [section 3]'
      ].join('\n')
    },
    {
      id: 'template_refine',
      scope: 'system',
      title: 'Rewrite & Improve',
      category: 'Editing',
      tags: ['rewrite', 'clarity'],
      content: [
        'Improve the draft below for clarity and actionability.',
        '',
        'Keep:',
        '- original intent',
        '- key terminology',
        '',
        'Improve:',
        '- structure',
        '- constraints',
        '- output format',
        '',
        'Draft:',
        '"""',
        '[paste draft]',
        '"""'
      ].join('\n')
    },
    {
      id: 'template_output',
      scope: 'system',
      title: 'Strict Output Schema',
      category: 'Automation',
      tags: ['json', 'schema'],
      content: [
        'Return only valid JSON with this shape:',
        '{',
        '  "summary": "string",',
        '  "actions": ["string"],',
        '  "risks": ["string"]',
        '}',
        '',
        'No markdown and no extra keys.'
      ].join('\n')
    }
  ]
}

function createStarterPrompts(profileId: string, createdAt: string): PromptDTO[] {
  return [
    {
      id: createId('prompt'),
      profileId,
      title: 'Weekly Status Summary',
      content: [
        'You are my staff-level project assistant.',
        '',
        'Summarize these notes into:',
        '1) Wins this week',
        '2) Risks and blockers',
        '3) Next actions with owner and due date',
        '',
        'Notes:',
        '"""',
        '[paste notes]',
        '"""'
      ].join('\n'),
      category: 'Work',
      tags: ['summary', 'status', 'work'],
      favorite: true,
      pinned: true,
      createdAt,
      updatedAt: createdAt,
      lastUsedAt: null,
      useCount: 0,
      displayOrder: 0,
      useCase: 'Weekly team update',
      aiTarget: 'ChatGPT'
    },
    {
      id: createId('prompt'),
      profileId,
      title: 'Feature Build Prompt',
      content: [
        'Act as a senior software engineer.',
        '',
        'Build this feature:',
        '- Explain architecture decisions first',
        '- Produce implementation steps',
        '- Write code',
        '- Include tests and edge cases',
        '',
        'Requirements:',
        '"""',
        '[paste requirements]',
        '"""'
      ].join('\n'),
      category: 'Engineering',
      tags: ['feature', 'implementation', 'coding'],
      favorite: false,
      pinned: false,
      createdAt,
      updatedAt: createdAt,
      lastUsedAt: null,
      useCount: 0,
      displayOrder: 1000,
      useCase: 'Feature delivery',
      aiTarget: 'ChatGPT'
    }
  ]
}

function ensureProfileStarterPrompts(db: BrowserDb, profileId: string): void {
  const exists = db.prompts.some((prompt) => prompt.profileId === profileId)
  if (exists) {
    return
  }
  const createdAt = nowIso()
  const starters = createStarterPrompts(profileId, createdAt)
  db.prompts = [...starters, ...db.prompts]
  db.versions = [
    ...starters.map((prompt) => ({
      id: createId('version'),
      promptId: prompt.id,
      versionType: 'original' as const,
      content: prompt.content,
      createdAt
    })),
    ...db.versions
  ]
}

function createDefaultDb(): BrowserDb {
  const createdAt = nowIso()
  const profileId = createId('profile')
  const sessionId = createId('session')
  const prompts: PromptDTO[] = createStarterPrompts(profileId, createdAt)

  const versions: PromptVersionDTO[] = prompts.map((prompt) => ({
    id: createId('version'),
    promptId: prompt.id,
    versionType: 'original',
    content: prompt.content,
    createdAt
  }))

  return {
    profiles: [
      {
        id: profileId,
        displayName: 'Web User',
        avatarSeed: 'WU',
        preferredTheme: 'system',
        createdAt,
        updatedAt: createdAt,
        lastSignedInAt: createdAt
      }
    ],
    sessions: [
      {
        id: sessionId,
        profileId,
        active: true,
        signedInAt: createdAt,
        signedOutAt: null
      }
    ],
    prompts,
    versions,
    themes: {
      [profileId]: 'system'
    },
    appearance: {
      [profileId]: { ...DEFAULT_APPEARANCE }
    },
    refineKeys: {},
    templates: createDefaultTemplates(),
    marketplace: {
      plugins: [],
      themes: [],
      activeThemeId: null
    },
    adminProfiles: {
      [profileId]: {
        ...DEFAULT_ADMIN_PROFILE,
        displayName: 'Web User'
      }
    },
    adminPins: {}
  }
}

function loadDb(): BrowserDb {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = createDefaultDb()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw) as BrowserDb
    if (!parsed || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.prompts)) {
      throw new Error('Invalid browser db')
    }
    const fallbackOrderByProfile = new Map<string, number>()
    parsed.prompts.forEach((prompt) => {
      if (Number.isFinite(prompt.displayOrder)) {
        return
      }
      const nextOrder = fallbackOrderByProfile.get(prompt.profileId) ?? 0
      prompt.displayOrder = nextOrder
      fallbackOrderByProfile.set(prompt.profileId, nextOrder + 1000)
    })
    if (!parsed.marketplace) {
      parsed.marketplace = {
        plugins: [],
        themes: [],
        activeThemeId: null
      }
    } else {
      parsed.marketplace.plugins = Array.isArray(parsed.marketplace.plugins) ? parsed.marketplace.plugins : []
      parsed.marketplace.themes = Array.isArray(parsed.marketplace.themes) ? parsed.marketplace.themes : []
      parsed.marketplace.activeThemeId =
        typeof parsed.marketplace.activeThemeId === 'string' ? parsed.marketplace.activeThemeId : null
    }
    if (!parsed.adminProfiles || typeof parsed.adminProfiles !== 'object') {
      parsed.adminProfiles = {}
    }
    if (!parsed.adminPins || typeof parsed.adminPins !== 'object') {
      parsed.adminPins = {}
    }
    if (!parsed.appearance || typeof parsed.appearance !== 'object') {
      parsed.appearance = {}
    }
    for (const profile of parsed.profiles) {
      parsed.appearance[profile.id] = normalizeAppearance(parsed.appearance[profile.id])
      parsed.adminProfiles[profile.id] = normalizeAdminProfile(
        parsed.adminProfiles[profile.id],
        profile.displayName
      )
      parsed.adminProfiles[profile.id].security.hasAdminPin = Boolean(parsed.adminPins[profile.id])
    }
    return parsed
  } catch {
    const seeded = createDefaultDb()
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    } catch {
      // Ignore persistence failures in private browsing modes.
    }
    return seeded
  }
}

function saveDb(db: BrowserDb) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Ignore persistence failures in private browsing modes.
  }
}

function withDb<T>(operation: (db: BrowserDb) => T): T {
  const db = loadDb()
  const result = operation(db)
  saveDb(db)
  return result
}

function sortPrompts(items: PromptDTO[]): PromptDTO[] {
  return [...items].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

function applyPromptFilters(items: PromptDTO[], filters?: PromptListFilters): PromptDTO[] {
  let rows = [...items]

  if (filters?.favorite === true) {
    rows = rows.filter((item) => item.favorite)
  }
  if (filters?.pinned === true) {
    rows = rows.filter((item) => item.pinned)
  }
  if (filters?.category?.trim()) {
    const needle = filters.category.trim().toLowerCase()
    rows = rows.filter((item) => item.category.toLowerCase() === needle)
  }
  if (filters?.tag?.trim()) {
    const needle = filters.tag.trim().toLowerCase()
    rows = rows.filter((item) => item.tags.some((tag) => tag.toLowerCase() === needle))
  }
  if (filters?.search?.trim()) {
    const needle = filters.search.trim().toLowerCase()
    rows = rows.filter((item) => {
      const haystack = [
        item.title,
        item.content,
        item.category,
        item.useCase ?? '',
        item.aiTarget ?? '',
        item.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }

  rows = sortPrompts(rows)

  if (typeof filters?.offset === 'number' && filters.offset > 0) {
    rows = rows.slice(filters.offset)
  }
  if (typeof filters?.limit === 'number' && filters.limit > 0) {
    rows = rows.slice(0, filters.limit)
  }

  return rows
}

function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary)
}

function decodeBase64(input: string): string {
  const binary = atob(input)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function findPromptOrThrow(db: BrowserDb, promptId: string): PromptDTO {
  const prompt = db.prompts.find((item) => item.id === promptId)
  if (!prompt) {
    throw new Error('Prompt not found')
  }
  return prompt
}

function toTagRows(prompts: PromptDTO[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  prompts.forEach((prompt) => {
    prompt.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    })
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function toCategoryRows(prompts: PromptDTO[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  prompts.forEach((prompt) => {
    counts.set(prompt.category, (counts.get(prompt.category) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function buildRefinedContent(request: RefinementRequest): RefinementResult {
  const base = request.content.trim()
  const goals = request.goals?.trim() || 'Improve clarity and output quality.'
  const preserveLine = request.preserveIntent !== false
    ? 'Preserve the original intent and constraints.'
    : 'You may rewrite intent for stronger output quality.'

  const improved = [
    'Role:',
    '- You are a precise assistant focused on reliable outputs.',
    '',
    'Objective:',
    `- ${goals}`,
    '',
    'Rules:',
    `- ${preserveLine}`,
    '- Ask follow-up questions only if critical details are missing.',
    '- Keep the response concise and structured.',
    '',
    'Prompt:',
    base,
    '',
    'Output format:',
    '- Brief answer first',
    '- Then actionable bullets'
  ].join('\n')

  return {
    providerId: 'browser-local',
    model: 'heuristic-refiner-v1',
    refinedContent: improved,
    notes: `Refined in browser mode from ${summarizePrompt(base)}`
  }
}

function downloadTextFile(fileName: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function pickFileText(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.txt,application/json,text/plain'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}

export function createBrowserApiClient(): ApiClient {
  return {
    app: {
      getInfo: async () => ({ version: '0.1.1' }),
      checkForUpdates: async () => ({
        ok: true,
        updateAvailable: false,
        currentVersion: '0.1.1',
        reason: 'Desktop update checks run in the packaged Electron app.',
        packaged: false
      }),
      downloadUpdate: async () => ({
        ok: false,
        reason: 'Update install is available in packaged desktop builds only.'
      }),
      scheduleUpdate: async () => ({
        ok: false,
        reason: 'Update scheduling is available in packaged desktop builds only.'
      }),
      openReleasePage: async () => ({ ok: true }),
      onUpdateEvent: () => () => undefined
    },
    window: {
      minimize: async () => undefined,
      toggleMaximize: async () => undefined,
      close: async () => undefined
    },
    profile: {
      list: async () =>
        withDb((db) =>
          clone(
            [...db.profiles].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
          )
        ),
      getSession: async () =>
        withDb((db) => {
          const activeSessions = [...db.sessions]
            .sort((a, b) => new Date(b.signedInAt).getTime() - new Date(a.signedInAt).getTime())
            .filter((session) => session.active)

          if (activeSessions.length === 0) {
            return null
          }

          const now = nowIso()
          const activeSession = activeSessions.find((session) => !isSessionExpired(session))

          db.sessions = db.sessions.map((session) =>
            session.active && isSessionExpired(session)
              ? { ...session, active: false, signedOutAt: session.signedOutAt ?? now }
              : session
          )

          if (!activeSession) {
            return null
          }

          ensureProfileStarterPrompts(db, activeSession.profileId)
          const profile = db.profiles.find((item) => item.id === activeSession.profileId)
          if (!profile) {
            return null
          }
          return clone({ profile, session: activeSession })
        }),
      createAndSignIn: async (displayName: string) =>
        withDb((db) => {
          const now = nowIso()
          const profile: ProfileDTO = {
            id: createId('profile'),
            displayName: displayName.trim() || 'Local User',
            avatarSeed: (displayName.trim().slice(0, 2) || 'LU').toUpperCase(),
            preferredTheme: 'system',
            createdAt: now,
            updatedAt: now,
            lastSignedInAt: now
          }
          db.profiles = [...db.profiles, profile]
          db.sessions = db.sessions.map((session) =>
            session.active ? { ...session, active: false, signedOutAt: now } : session
          )
          const session: SessionDTO = {
            id: createId('session'),
            profileId: profile.id,
            active: true,
            signedInAt: now,
            signedOutAt: null
          }
          db.sessions = [...db.sessions, session]
          db.themes[profile.id] = 'system'
          db.appearance[profile.id] = { ...DEFAULT_APPEARANCE }
          ensureProfileStarterPrompts(db, profile.id)
          return clone({ profile, session })
        }),
      signIn: async (profileId: string) =>
        withDb((db) => {
          const profile = db.profiles.find((item) => item.id === profileId)
          if (!profile) {
            throw new Error('Profile not found')
          }
          const now = nowIso()
          db.sessions = db.sessions.map((session) =>
            session.active ? { ...session, active: false, signedOutAt: now } : session
          )
          const session: SessionDTO = {
            id: createId('session'),
            profileId,
            active: true,
            signedInAt: now,
            signedOutAt: null
          }
          db.sessions = [...db.sessions, session]
          profile.lastSignedInAt = now
          profile.updatedAt = now
          ensureProfileStarterPrompts(db, profile.id)
          return clone({ profile, session })
        }),
      signOut: async () =>
        withDb((db) => {
          const now = nowIso()
          db.sessions = db.sessions.map((session) =>
            session.active ? { ...session, active: false, signedOutAt: now } : session
          )
          return { ok: true }
        }),
      updateTheme: async (profileId: string, theme: ThemeMode) =>
        withDb((db) => {
          const profile = db.profiles.find((item) => item.id === profileId)
          if (!profile) {
            throw new Error('Profile not found')
          }
          profile.preferredTheme = theme
          profile.updatedAt = nowIso()
          db.themes[profileId] = theme
          return clone(profile)
        })
    },
    prompt: {
      list: async (profileId: string, filters?: PromptListFilters) =>
        withDb((db) => {
          const rows = db.prompts.filter((prompt) => prompt.profileId === profileId)
          return clone(applyPromptFilters(rows, filters))
        }),
      recent: async (profileId: string, limit = 20) =>
        withDb((db) =>
          clone(
            [...db.prompts]
              .filter((prompt) => prompt.profileId === profileId)
              .sort((a, b) => {
                const aTime = new Date(a.lastUsedAt ?? a.updatedAt).getTime()
                const bTime = new Date(b.lastUsedAt ?? b.updatedAt).getTime()
                return bTime - aTime
              })
              .slice(0, limit)
          )
        ),
      tags: async (profileId: string) =>
        withDb((db) => clone(toTagRows(db.prompts.filter((prompt) => prompt.profileId === profileId)))),
      categories: async (profileId: string) =>
        withDb((db) =>
          clone(toCategoryRows(db.prompts.filter((prompt) => prompt.profileId === profileId)))
        ),
      getById: async (id: string) =>
        withDb((db) => clone(db.prompts.find((prompt) => prompt.id === id) ?? null)),
      create: async (profileId: string, input: CreatePromptInput) =>
        withDb((db) => {
          const issues = validatePromptForSave(input)
          if (issues.length > 0) {
            throw new Error(formatPromptValidationIssues(issues))
          }
          const now = nowIso()
          const prompt: PromptDTO = {
            id: createId('prompt'),
            profileId,
            title: input.title?.trim() || 'Untitled Prompt',
            content: input.content?.trim() || '',
            category: input.category?.trim() || 'General',
            tags: uniqueTags(input.tags),
            favorite: input.favorite ?? false,
            pinned: input.pinned ?? false,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: null,
            useCount: 0,
            displayOrder: nextDisplayOrder(db.prompts, profileId),
            useCase: input.useCase?.trim() || undefined,
            aiTarget: input.aiTarget?.trim() || undefined,
            validatedAt: undefined,
            validationProvider: undefined,
            validationModel: undefined,
            validationNotes: undefined
          }
          db.prompts = [prompt, ...db.prompts]
          db.versions = [
            {
              id: createId('version'),
              promptId: prompt.id,
              versionType: 'original',
              content: prompt.content,
              createdAt: now
            },
            ...db.versions
          ]
          return clone(prompt)
        }),
      update: async (profileId: string, input: UpdatePromptInput) =>
        withDb((db) => {
          const issues = validatePromptForSave(input)
          if (issues.length > 0) {
            throw new Error(formatPromptValidationIssues(issues))
          }
          const prompt = findPromptOrThrow(db, input.id)
          if (prompt.profileId !== profileId) {
            throw new Error('Cannot update another profile prompt')
          }
          prompt.title = input.title?.trim() || prompt.title
          prompt.content = input.content?.trim() || ''
          prompt.category = input.category?.trim() || 'General'
          prompt.tags = uniqueTags(input.tags)
          prompt.useCase = input.useCase?.trim() || undefined
          prompt.aiTarget = input.aiTarget?.trim() || undefined
          prompt.validatedAt = undefined
          prompt.validationProvider = undefined
          prompt.validationModel = undefined
          prompt.validationNotes = undefined
          prompt.updatedAt = nowIso()
          db.versions = [
            {
              id: createId('version'),
              promptId: prompt.id,
              versionType: 'manual',
              content: prompt.content,
              createdAt: prompt.updatedAt
            },
            ...db.versions
          ]
          return clone(prompt)
        }),
      delete: async (profileId: string, id: string) =>
        withDb((db) => {
          db.prompts = db.prompts.filter((prompt) => !(prompt.profileId === profileId && prompt.id === id))
          db.versions = db.versions.filter((version) => version.promptId !== id)
          return { ok: true }
        }),
      reorder: async (profileId: string, promptIds: string[]) =>
        withDb((db) => {
          const uniqueIds = [...new Set(promptIds)]
          const promptsById = new Map(db.prompts.map((prompt) => [prompt.id, prompt]))
          if (uniqueIds.some((id) => promptsById.get(id)?.profileId !== profileId)) {
            throw new Error('Cannot reorder prompts outside the active profile')
          }

          uniqueIds.forEach((id, index) => {
            const prompt = promptsById.get(id)
            if (prompt) {
              prompt.displayOrder = index * 1000
            }
          })

          return clone(applyPromptFilters(db.prompts.filter((prompt) => prompt.profileId === profileId)))
        }),
      toggleFavorite: async (profileId: string, id: string) =>
        withDb((db) => {
          const prompt = findPromptOrThrow(db, id)
          if (prompt.profileId !== profileId) {
            throw new Error('Cannot update another profile prompt')
          }
          prompt.favorite = !prompt.favorite
          prompt.updatedAt = nowIso()
          return clone(prompt)
        }),
      togglePinned: async (profileId: string, id: string) =>
        withDb((db) => {
          const prompt = findPromptOrThrow(db, id)
          if (prompt.profileId !== profileId) {
            throw new Error('Cannot update another profile prompt')
          }
          prompt.pinned = !prompt.pinned
          prompt.updatedAt = nowIso()
          return clone(prompt)
        }),
      markUsed: async (profileId: string, id: string) =>
        withDb((db) => {
          const prompt = findPromptOrThrow(db, id)
          if (prompt.profileId !== profileId) {
            throw new Error('Cannot update another profile prompt')
          }
          const now = nowIso()
          prompt.lastUsedAt = now
          prompt.updatedAt = now
          prompt.useCount += 1
          return clone(prompt)
        }),
      versions: async (promptId: string) =>
        withDb((db) =>
          clone(
            db.versions
              .filter((version) => version.promptId === promptId)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          )
        ),
      applyRefinement: async (input) =>
        withDb((db) => {
          const now = nowIso()
          if (input.mode === 'replace') {
            const prompt = findPromptOrThrow(db, input.promptId)
            prompt.content = input.refinedContent
            prompt.refinedVersion = input.refinedContent
            prompt.validatedAt = undefined
            prompt.validationProvider = undefined
            prompt.validationModel = undefined
            prompt.validationNotes = undefined
            prompt.updatedAt = now
            db.versions = [
              {
                id: createId('version'),
                promptId: prompt.id,
                versionType: 'refined',
                content: input.refinedContent,
                provider: input.provider,
                model: input.model,
                metadataJson: input.notes,
                createdAt: now
              },
              ...db.versions
            ]
            return clone(prompt)
          }

          const source = findPromptOrThrow(db, input.promptId)
          const created: PromptDTO = {
            ...source,
            id: createId('prompt'),
            title: `${source.title} (Improved)`,
            content: input.refinedContent,
            favorite: false,
            pinned: false,
            refinedVersion: input.refinedContent,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: null,
            useCount: 0,
            displayOrder: nextDisplayOrder(db.prompts, source.profileId),
            validatedAt: undefined,
            validationProvider: undefined,
            validationModel: undefined,
            validationNotes: undefined
          }
          db.prompts = [created, ...db.prompts]
          db.versions = [
            {
              id: createId('version'),
              promptId: created.id,
              versionType: 'refined',
              content: input.refinedContent,
              provider: input.provider,
              model: input.model,
              metadataJson: input.notes,
              createdAt: now
            },
            ...db.versions
          ]
          return clone(created)
        }),
      validateWithGroq: async (profileId: string, promptId: string) =>
        withDb((db) => {
          const prompt = findPromptOrThrow(db, promptId)
          if (prompt.profileId !== profileId) {
            throw new Error('Cannot validate another profile prompt')
          }
          prompt.validatedAt = nowIso()
          prompt.validationProvider = 'groq'
          prompt.validationModel = 'browser-simulated-groq'
          prompt.validationNotes = 'pass: Prompt looks clear and reusable.'
          prompt.updatedAt = prompt.validatedAt
          return clone(prompt)
        }),
      saveImage: async (input: {
        profileId: string
        promptId: string
        fileName: string
        mimeType: string
        dataUrl: string
      }) => {
        if (!input.mimeType.startsWith('image/')) {
          throw new Error('Only image files can be added to prompt markdown.')
        }
        const safeName = input.fileName.replace(/[^a-z0-9._-]/gi, '_') || 'image'
        const altText = safeName.replace(/\.[^.]+$/, '')
        return {
          ok: true,
          markdown: `![${altText}](${input.dataUrl})`,
          fileUrl: input.dataUrl,
          filePath: `browser://${input.profileId}/${input.promptId}/${safeName}`
        }
      }
    },
    tag: {
      list: async (profileId: string) =>
        withDb((db) => clone(toTagRows(db.prompts.filter((prompt) => prompt.profileId === profileId))))
    },
    search: {
      query: async (profileId: string, query = '', filters?: PromptListFilters) =>
        withDb((db) => {
          const rows = db.prompts.filter((prompt) => prompt.profileId === profileId)
          return clone(applyPromptFilters(rows, { ...filters, search: query }))
        })
    },
    template: {
      list: async () => withDb((db) => clone(db.templates)),
      create: async (input: CreateTemplateInput) =>
        withDb((db) => {
          const normalized = normalizeTemplate(input)
          if (normalized.title.length < 3) {
            throw new Error('Template title must be at least 3 characters.')
          }
          if (normalized.content.length < 12) {
            throw new Error('Template content must be at least 12 characters.')
          }

          const created: TemplateDTO = {
            id: createId('template'),
            scope: 'user',
            title: normalized.title,
            content: normalized.content,
            category: normalized.category,
            tags: normalized.tags
          }
          db.templates = [...db.templates, created].sort((a, b) => {
            if (a.scope !== b.scope) {
              return a.scope === 'system' ? -1 : 1
            }
            return a.title.localeCompare(b.title)
          })
          return clone(created)
        }),
      update: async (input: UpdateTemplateInput) =>
        withDb((db) => {
          const existing = db.templates.find((item) => item.id === input.id)
          if (!existing) {
            throw new Error('Template not found')
          }
          if (existing.scope !== 'user') {
            throw new Error('System templates are read-only')
          }
          const normalized = normalizeTemplate(input)
          if (normalized.title.length < 3) {
            throw new Error('Template title must be at least 3 characters.')
          }
          if (normalized.content.length < 12) {
            throw new Error('Template content must be at least 12 characters.')
          }
          existing.title = normalized.title
          existing.content = normalized.content
          existing.category = normalized.category
          existing.tags = normalized.tags
          db.templates = db.templates.sort((a, b) => {
            if (a.scope !== b.scope) {
              return a.scope === 'system' ? -1 : 1
            }
            return a.title.localeCompare(b.title)
          })
          return clone(existing)
        }),
      delete: async (id: string) =>
        withDb((db) => {
          const existing = db.templates.find((item) => item.id === id)
          if (!existing) {
            throw new Error('Template not found')
          }
          if (existing.scope !== 'user') {
            throw new Error('System templates cannot be deleted')
          }
          db.templates = db.templates.filter((item) => item.id !== id)
          return { ok: true }
        })
    },
    refine: {
      providers: async () => ['browser-local'],
      isConfigured: async () => true,
      saveApiKey: async (profileId: string, apiKey: string) =>
        withDb((db) => {
          db.refineKeys[profileId] = apiKey.trim()
          return { ok: true }
        }),
      clearApiKey: async (profileId: string) =>
        withDb((db) => {
          delete db.refineKeys[profileId]
          return { ok: true }
        }),
      prompt: async (request: RefinementRequest) => buildRefinedContent(request)
    },
    share: {
      generateCode: async (promptId: string) =>
        withDb((db) => {
          const prompt = findPromptOrThrow(db, promptId)
          const issues = validatePromptForShare(prompt)
          if (issues.length > 0) {
            throw new Error(formatPromptValidationIssues(issues))
          }
          const sharePackage: SharePackageV1 = {
            schemaVersion: 'ampnotes.share.v1',
            createdAt: nowIso(),
            source: {
              app: 'ampnotes',
              version: 'browser'
            },
            prompt: {
              title: prompt.title,
              content: prompt.content,
              category: prompt.category,
              tags: prompt.tags,
              useCase: prompt.useCase,
              aiTarget: prompt.aiTarget,
              refinedVersion: prompt.refinedVersion,
              createdAt: prompt.createdAt,
              updatedAt: prompt.updatedAt
            },
            checksum: createId('checksum')
          }
          return {
            encoded: encodeBase64(JSON.stringify(sharePackage)),
            package: sharePackage
          }
        }),
      exportPrompt: async (profileId: string, promptId: string, format: 'json' | 'txt') =>
        withDb((db) => {
          const prompt = findPromptOrThrow(db, promptId)
          if (prompt.profileId !== profileId) {
            throw new Error('Cannot export another profile prompt')
          }
          const issues = validatePromptForShare(prompt)
          if (issues.length > 0) {
            throw new Error(formatPromptValidationIssues(issues))
          }

          if (typeof document !== 'undefined') {
            if (format === 'json') {
              const payload = JSON.stringify(prompt, null, 2)
              downloadTextFile(`${prompt.title.replace(/\s+/g, '-').toLowerCase()}.json`, payload, 'application/json')
            } else {
              downloadTextFile(
                `${prompt.title.replace(/\s+/g, '-').toLowerCase()}.txt`,
                prompt.content,
                'text/plain'
              )
            }
          }

          return { ok: true }
        }),
      exportSelected: async (
        profileId: string,
        selection: { promptIds: string[]; templateIds: string[] }
      ) =>
        withDb((db) => {
          const promptIds = Array.from(new Set(selection.promptIds))
          const templateIds = Array.from(new Set(selection.templateIds))
          if (promptIds.length === 0 && templateIds.length === 0) {
            throw new Error('Select at least one prompt or template to export')
          }

          const prompts = db.prompts.filter(
            (prompt) => prompt.profileId === profileId && promptIds.includes(prompt.id)
          )
          const templates = db.templates.filter((template) => templateIds.includes(template.id))

          if (prompts.length !== promptIds.length || templates.length !== templateIds.length) {
            throw new Error('Some selected items are no longer available')
          }

          const invalidPrompt = prompts.find((prompt) => validatePromptForShare(prompt).length > 0)
          if (invalidPrompt) {
            const issues = validatePromptForShare(invalidPrompt)
            throw new Error(
              `Prompt "${invalidPrompt.title}" is not ready for export. ${formatPromptValidationIssues(issues)}`
            )
          }

          const bundle: SelectedExportBundle = {
            schemaVersion: 'ampnotes.selection.export.v1',
            createdAt: nowIso(),
            source: {
              app: 'ampnotes',
              version: 'browser'
            },
            prompts: prompts.map((prompt) => ({
              schemaVersion: 'ampnotes.share.v1',
              createdAt: nowIso(),
              source: {
                app: 'ampnotes',
                version: 'browser'
              },
              prompt: {
                title: prompt.title,
                content: prompt.content,
                category: prompt.category,
                tags: prompt.tags,
                useCase: prompt.useCase,
                aiTarget: prompt.aiTarget,
                refinedVersion: prompt.refinedVersion,
                createdAt: prompt.createdAt,
                updatedAt: prompt.updatedAt
              },
              checksum: createId('checksum')
            })),
            templates: templates.map((template) => ({
              id: template.id,
              scope: template.scope,
              title: template.title,
              content: template.content,
              category: template.category,
              tags: template.tags
            }))
          }

          if (typeof document !== 'undefined') {
            downloadTextFile(
              `ampnotes-selected-export-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(bundle, null, 2),
              'application/json'
            )
          }

          return { ok: true }
        }),
      importCode: async (
        profileId: string,
        encoded: string,
        strategy: ImportConflictStrategy = 'import_copy'
      ) =>
        withDb((db) => {
          let parsed: SharePackageV1
          try {
            parsed = JSON.parse(decodeBase64(encoded)) as SharePackageV1
          } catch {
            return { imported: false, reason: 'Invalid share code.' } satisfies ImportResult
          }

          const existing = db.prompts.find(
            (prompt) =>
              prompt.profileId === profileId &&
              prompt.title.trim().toLowerCase() === parsed.prompt.title.trim().toLowerCase()
          )

          if (existing && strategy === 'skip') {
            return { imported: false, reason: 'Prompt already exists.' } satisfies ImportResult
          }

          const now = nowIso()
          const baseTitle = parsed.prompt.title?.trim() || 'Imported Prompt'
          const title =
            existing && strategy === 'import_copy'
              ? `${baseTitle} (Imported)`
              : baseTitle

          const imported: PromptDTO = {
            id: createId('prompt'),
            profileId,
            title,
            content: parsed.prompt.content || '',
            category: parsed.prompt.category || 'General',
            tags: uniqueTags(parsed.prompt.tags),
            favorite: false,
            pinned: false,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: null,
            useCount: 0,
            displayOrder: nextDisplayOrder(db.prompts, profileId),
            useCase: parsed.prompt.useCase,
            aiTarget: parsed.prompt.aiTarget,
            refinedVersion: parsed.prompt.refinedVersion
          }

          db.prompts = [imported, ...db.prompts]
          db.versions = [
            {
              id: createId('version'),
              promptId: imported.id,
              versionType: 'original',
              content: imported.content,
              createdAt: now
            },
            ...db.versions
          ]

          return { imported: true, prompt: clone(imported) } satisfies ImportResult
        }),
      importFile: async (profileId: string) => {
        if (typeof document === 'undefined') {
          return { imported: false, reason: 'File import is not available in this environment.' }
        }

        const text = await pickFileText()
        if (!text) {
          return { imported: false, reason: 'No file selected.' }
        }

        try {
          const parsed = JSON.parse(text) as Partial<PromptDTO> | SharePackageV1
          if ('schemaVersion' in parsed) {
            return withDb((db) => {
              const now = nowIso()
              const imported: PromptDTO = {
                id: createId('prompt'),
                profileId,
                title: parsed.prompt.title || 'Imported Prompt',
                content: parsed.prompt.content || '',
                category: parsed.prompt.category || 'General',
                tags: uniqueTags(parsed.prompt.tags),
                favorite: false,
                pinned: false,
                createdAt: now,
                updatedAt: now,
                lastUsedAt: null,
                useCount: 0,
                displayOrder: nextDisplayOrder(db.prompts, profileId),
                useCase: parsed.prompt.useCase,
                aiTarget: parsed.prompt.aiTarget,
                refinedVersion: parsed.prompt.refinedVersion
              }
              db.prompts = [imported, ...db.prompts]
              return { imported: true, prompt: clone(imported) } satisfies ImportResult
            })
          }

          return withDb((db) => {
            const now = nowIso()
            const imported: PromptDTO = {
              id: createId('prompt'),
              profileId,
              title: parsed.title?.trim() || 'Imported Prompt',
              content: parsed.content?.trim() || '',
              category: parsed.category?.trim() || 'General',
              tags: uniqueTags(parsed.tags as string[]),
              favorite: false,
              pinned: false,
              createdAt: now,
              updatedAt: now,
              lastUsedAt: null,
              useCount: 0,
              displayOrder: nextDisplayOrder(db.prompts, profileId),
              useCase: parsed.useCase?.trim() || undefined,
              aiTarget: parsed.aiTarget?.trim() || undefined
            }
            db.prompts = [imported, ...db.prompts]
            return { imported: true, prompt: clone(imported) } satisfies ImportResult
          })
        } catch {
          return withDb((db) => {
            const now = nowIso()
            const imported: PromptDTO = {
              id: createId('prompt'),
              profileId,
              title: 'Imported Prompt',
              content: text.trim(),
              category: 'General',
              tags: [],
              favorite: false,
              pinned: false,
              createdAt: now,
              updatedAt: now,
              lastUsedAt: null,
              useCount: 0,
              displayOrder: nextDisplayOrder(db.prompts, profileId)
            }
            db.prompts = [imported, ...db.prompts]
            return { imported: true, prompt: clone(imported) } satisfies ImportResult
          })
        }
      }
    },
    settings: {
      getTheme: async (profileId: string) =>
        withDb((db) => db.themes[profileId] ?? 'system'),
      setTheme: async (profileId: string, theme: ThemeMode) =>
        withDb((db) => {
          db.themes[profileId] = theme
          const profile = db.profiles.find((item) => item.id === profileId)
          if (profile) {
            profile.preferredTheme = theme
            profile.updatedAt = nowIso()
          }
          return theme
        }),
      getAppearance: async (profileId: string) =>
        withDb((db) => {
          db.appearance[profileId] = normalizeAppearance(db.appearance[profileId])
          return clone(db.appearance[profileId])
        }),
        setAppearance: async (profileId: string, appearance: AppearanceSettingsDTO) =>
          withDb((db) => {
            const normalized = normalizeAppearance(appearance)
            db.appearance[profileId] = normalized
            return clone(normalized)
          }),
      getAdminProfile: async (profileId: string) =>
        withDb((db) => {
          const fallbackName = db.profiles.find((item) => item.id === profileId)?.displayName ?? 'AMP User'
          const profile = normalizeAdminProfile(db.adminProfiles[profileId], fallbackName)
          profile.security.hasAdminPin = Boolean(db.adminPins[profileId])
          db.adminProfiles[profileId] = profile
          return clone(profile)
        }),
      setAdminProfile: async (profileId: string, profile: AdminProfileInput) =>
        withDb((db) => {
          const fallbackName = db.profiles.find((item) => item.id === profileId)?.displayName ?? 'AMP User'
          const current = normalizeAdminProfile(db.adminProfiles[profileId], fallbackName)
          const next = normalizeAdminProfile(
            {
              ...current,
              ...profile,
              socials: profile.socials ? { ...current.socials, ...profile.socials } : current.socials
            },
            fallbackName
          )
          next.security.hasAdminPin = Boolean(db.adminPins[profileId])
          db.adminProfiles[profileId] = next
          return clone(next)
        }),
      setAdminPin: async (profileId: string, pin: string) =>
        withDb((db) => {
          db.adminPins[profileId] = hashBrowserPin(pin)
          const fallbackName = db.profiles.find((item) => item.id === profileId)?.displayName ?? 'AMP User'
          const profile = normalizeAdminProfile(db.adminProfiles[profileId], fallbackName)
          profile.security.hasAdminPin = true
          db.adminProfiles[profileId] = profile
          return clone(profile)
        }),
      verifyAdminPin: async (profileId: string, pin: string) =>
        withDb((db) => ({ ok: db.adminPins[profileId] === hashBrowserPin(pin) })),
      clearAdminPin: async (profileId: string) =>
        withDb((db) => {
          delete db.adminPins[profileId]
          const fallbackName = db.profiles.find((item) => item.id === profileId)?.displayName ?? 'AMP User'
          const profile = normalizeAdminProfile(db.adminProfiles[profileId], fallbackName)
          profile.security.hasAdminPin = false
          db.adminProfiles[profileId] = profile
          return clone(profile)
        })
      },
    marketplace: {
      getState: async (_profileId: string) =>
        withDb((db) => {
          const state: MarketplaceStateDTO = {
            plugins: [...db.marketplace.plugins].sort((a, b) => a.name.localeCompare(b.name)),
            themes: [...db.marketplace.themes].sort((a, b) => a.name.localeCompare(b.name)),
            activeThemeId: db.marketplace.activeThemeId
          }
          return clone(state)
        }),
      installCode: async (profileId: string, kind: 'plugin' | 'theme', code: string) => {
        const manifest = decodeMarketplaceInstallCode(kind, code)
        if (kind === 'plugin') {
          return withDb((db) => {
            const normalized = normalizePluginManifest(manifest as CreatePluginManifestInput)
            const existing = db.marketplace.plugins.find((item) => item.id === normalized.id)
            const plugin: InstalledPluginDTO = {
              ...normalized,
              enabled: false,
              installedAt: existing?.installedAt ?? nowIso(),
              source: 'marketplace'
            }
            db.marketplace.plugins = [
              ...db.marketplace.plugins.filter((item) => item.id !== normalized.id),
              plugin
            ].sort((a, b) => a.name.localeCompare(b.name))
            return { kind, id: plugin.id, name: plugin.name, enabled: false }
          })
        }
        return withDb((db) => {
          const normalized = normalizeThemeManifest(manifest as CreateThemeManifestInput)
          const existing = db.marketplace.themes.find((item) => item.id === normalized.id)
          const theme: InstalledThemeDTO = {
            ...normalized,
            installedAt: existing?.installedAt ?? nowIso(),
            source: 'marketplace'
          }
          db.marketplace.themes = [
            ...db.marketplace.themes.filter((item) => item.id !== normalized.id),
            theme
          ].sort((a, b) => a.name.localeCompare(b.name))
          return { kind, id: theme.id, name: theme.name, active: false }
        })
      },
      registerPlugin: async (_profileId: string, manifest: CreatePluginManifestInput) =>
        withDb((db) => {
          const normalized = normalizePluginManifest(manifest)
          if (normalized.id.length < 3 || normalized.name.length < 2 || normalized.version.length < 1) {
            throw new Error('Invalid plugin manifest')
          }
          const existing = db.marketplace.plugins.find((item) => item.id === normalized.id)
          const plugin: InstalledPluginDTO = {
            ...normalized,
            enabled: existing?.enabled ?? true,
            installedAt: existing?.installedAt ?? nowIso(),
            source: 'marketplace'
          }
          db.marketplace.plugins = [
            ...db.marketplace.plugins.filter((item) => item.id !== normalized.id),
            plugin
          ].sort((a, b) => a.name.localeCompare(b.name))
          return clone(plugin)
        }),
      importPluginManifestFile: async (profileId: string) => {
        if (typeof document === 'undefined') {
          return { ok: false, reason: 'File import is not available in this environment.' }
        }
        const text = await pickFileText()
        if (!text) {
          return { ok: false, canceled: true, reason: 'No file selected.' }
        }
        const manifest = normalizePluginManifest(JSON.parse(text) as CreatePluginManifestInput)
        await withDb((db) => {
          const existing = db.marketplace.plugins.find((item) => item.id === manifest.id)
          const plugin: InstalledPluginDTO = {
            ...manifest,
            enabled: existing?.enabled ?? true,
            installedAt: existing?.installedAt ?? nowIso(),
            source: 'local'
          }
          db.marketplace.plugins = [
            ...db.marketplace.plugins.filter((item) => item.id !== manifest.id),
            plugin
          ].sort((a, b) => a.name.localeCompare(b.name))
        })
        return { ok: true }
      },
      importPluginFromFolder: async () => ({
        ok: false,
        reason: 'Folder import is available in the desktop app.'
      }),
      exportPluginManifest: async (_profileId: string, pluginId: string) =>
        withDb((db) => {
          const plugin = db.marketplace.plugins.find((item) => item.id === pluginId)
          if (!plugin) {
            throw new Error('Plugin not found')
          }
          if (typeof document !== 'undefined') {
            downloadTextFile(`${plugin.id}.plugin.json`, JSON.stringify(toPluginManifest(plugin), null, 2), 'application/json')
          }
          return { ok: true }
        }),
      setPluginEnabled: async (_profileId: string, pluginId: string, enabled: boolean) =>
        withDb((db) => {
          const existing = db.marketplace.plugins.find((item) => item.id === pluginId)
          if (!existing) {
            throw new Error('Plugin not found')
          }
          existing.enabled = enabled
          return clone(existing)
        }),
      removePlugin: async (_profileId: string, pluginId: string) =>
        withDb((db) => {
          db.marketplace.plugins = db.marketplace.plugins.filter((item) => item.id !== pluginId)
          return { ok: true }
        }),
      openPluginFolder: async () => ({
        ok: false,
        reason: 'Plugin folders are available in the desktop app.'
      }),
      registerTheme: async (_profileId: string, manifest: CreateThemeManifestInput) =>
        withDb((db) => {
          const normalized = normalizeThemeManifest(manifest)
          if (normalized.id.length < 3 || normalized.name.length < 2 || normalized.version.length < 1) {
            throw new Error('Invalid theme manifest')
          }
          const existing = db.marketplace.themes.find((item) => item.id === normalized.id)
          const theme: InstalledThemeDTO = {
            ...normalized,
            installedAt: existing?.installedAt ?? nowIso(),
            source: 'marketplace'
          }
          db.marketplace.themes = [
            ...db.marketplace.themes.filter((item) => item.id !== normalized.id),
            theme
          ].sort((a, b) => a.name.localeCompare(b.name))
          return clone(theme)
        }),
      importThemeManifestFile: async (profileId: string) => {
        if (typeof document === 'undefined') {
          return { ok: false, reason: 'File import is not available in this environment.' }
        }
        const text = await pickFileText()
        if (!text) {
          return { ok: false, canceled: true, reason: 'No file selected.' }
        }
        const manifest = normalizeThemeManifest(JSON.parse(text) as CreateThemeManifestInput)
        await withDb((db) => {
          const existing = db.marketplace.themes.find((item) => item.id === manifest.id)
          const theme: InstalledThemeDTO = {
            ...manifest,
            installedAt: existing?.installedAt ?? nowIso(),
            source: 'local'
          }
          db.marketplace.themes = [
            ...db.marketplace.themes.filter((item) => item.id !== manifest.id),
            theme
          ].sort((a, b) => a.name.localeCompare(b.name))
        })
        return { ok: true }
      },
      importThemeFromFolder: async () => ({
        ok: false,
        reason: 'Folder import is available in the desktop app.'
      }),
      exportThemeManifest: async (_profileId: string, themeId: string) =>
        withDb((db) => {
          const theme = db.marketplace.themes.find((item) => item.id === themeId)
          if (!theme) {
            throw new Error('Theme not found')
          }
          if (typeof document !== 'undefined') {
            downloadTextFile(`${theme.id}.theme.json`, JSON.stringify(toThemeManifest(theme), null, 2), 'application/json')
          }
          return { ok: true }
        }),
      setActiveTheme: async (_profileId: string, themeId: string | null) =>
        withDb((db) => {
          if (themeId) {
            const exists = db.marketplace.themes.some((item) => item.id === themeId)
            if (!exists) {
              throw new Error('Theme not found')
            }
          }
          db.marketplace.activeThemeId = themeId
          return themeId
        }),
      removeTheme: async (_profileId: string, themeId: string) =>
        withDb((db) => {
          db.marketplace.themes = db.marketplace.themes.filter((item) => item.id !== themeId)
          if (db.marketplace.activeThemeId === themeId) {
            db.marketplace.activeThemeId = null
          }
          return { ok: true }
        }),
      openThemeFolder: async () => ({
        ok: false,
        reason: 'Theme folders are available in the desktop app.'
      }),
      onDeepLinkInstalled: () => () => {},
      onDeepLinkNotice: () => () => {}
    }
  }
}
