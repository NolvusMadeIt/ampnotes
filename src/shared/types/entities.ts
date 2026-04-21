export type ThemeMode = 'light' | 'dark' | 'system'
export type FontFamilyOption = 'merriweather' | 'sourceSerif' | 'lora' | 'ibmPlexSans' | 'publicSans'
export type ThemePresetOption = 'midnight' | 'ocean' | 'graphite' | 'forest' | 'sand'

export interface AppearanceSettingsDTO {
  fontFamily: FontFamilyOption
  fontScale: number
  themePreset: ThemePresetOption
}

export interface ProfileDTO {
  id: string
  displayName: string
  avatarSeed: string
  preferredTheme: ThemeMode
  createdAt: string
  updatedAt: string
  lastSignedInAt: string | null
}

export interface SessionDTO {
  id: string
  profileId: string
  active: boolean
  signedInAt: string
  signedOutAt: string | null
}

export interface PromptDTO {
  id: string
  profileId: string
  title: string
  content: string
  category: string
  tags: string[]
  folder?: string | null
  favorite: boolean
  pinned: boolean
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  useCount: number
  displayOrder: number
  useCase?: string
  aiTarget?: string
  refinedVersion?: string
  validatedAt?: string
  validationProvider?: string
  validationModel?: string
  validationNotes?: string
}

export interface PromptVersionDTO {
  id: string
  promptId: string
  versionType: 'original' | 'refined' | 'manual'
  content: string
  provider?: string
  model?: string
  metadataJson?: string
  createdAt: string
}

export interface TemplateDTO {
  id: string
  scope: 'system' | 'user'
  title: string
  content: string
  category?: string
  tags: string[]
}

export interface CreateTemplateInput {
  title: string
  content: string
  category?: string
  tags?: string[]
}

export interface UpdateTemplateInput extends CreateTemplateInput {
  id: string
}

export interface CreatePluginManifestInput {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  entry?: string
  homepage?: string
  socials?: CreatorSocialLinks
  credits?: ExportCredits
  permissions?: string[]
}

export interface InstalledPluginDTO extends CreatePluginManifestInput {
  enabled: boolean
  installedAt: string
  source: 'local' | 'marketplace'
  folderPath?: string
}

export interface ThemeTokenMap {
  light?: Record<string, string>
  dark?: Record<string, string>
}

export interface CreateThemeManifestInput {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  homepage?: string
  socials?: CreatorSocialLinks
  credits?: ExportCredits
  tokens: ThemeTokenMap
}

export interface CreatorSocialLinks {
  github?: string
  x?: string
  website?: string
}

export interface ExportCredits {
  name: string
  socials?: CreatorSocialLinks
}

export interface AdminProfileDTO {
  displayName: string
  avatarUrl?: string
  socials: CreatorSocialLinks
  security: {
    hasAdminPin: boolean
    windowsDevicePinHintEnabled: boolean
  }
}

export interface AdminProfileInput {
  displayName: string
  avatarUrl?: string
  socials?: CreatorSocialLinks
  windowsDevicePinHintEnabled?: boolean
}

export interface InstalledThemeDTO extends CreateThemeManifestInput {
  installedAt: string
  source: 'local' | 'marketplace'
  folderPath?: string
}

export interface MarketplaceStateDTO {
  plugins: InstalledPluginDTO[]
  themes: InstalledThemeDTO[]
  activeThemeId: string | null
}

export interface MarketplaceFolderResult {
  ok: boolean
  folderPath?: string
  reason?: string
}

export interface MarketplaceTransferResult {
  ok: boolean
  canceled?: boolean
  filePath?: string
  folderPath?: string
  reason?: string
}

export interface MarketplaceDeepLinkInstalledEvent {
  kind: 'plugin' | 'theme'
  id: string
  name: string
  enabled?: boolean
  active?: boolean
}

export interface MarketplaceDeepLinkNoticeEvent {
  tone: 'info' | 'success' | 'warning' | 'danger'
  message: string
}

export interface CreatePromptInput {
  title: string
  content: string
  category?: string
  tags?: string[]
  folder?: string
  useCase?: string
  aiTarget?: string
  favorite?: boolean
  pinned?: boolean
}

export interface UpdatePromptInput extends CreatePromptInput {
  id: string
}

export interface PromptListFilters {
  search?: string
  favorite?: boolean
  pinned?: boolean
  category?: string
  tag?: string
  folder?: string
  limit?: number
  offset?: number
}

export interface RefinementRequest {
  profileId: string
  promptId?: string
  content: string
  goals?: string
  preserveIntent?: boolean
  targetTool?: string
}

export interface RefinementResult {
  providerId: string
  model: string
  refinedContent: string
  notes: string
}

export interface PromptValidationResult {
  providerId: string
  model: string
  verdict: 'pass' | 'needs_work'
  notes: string
}

export interface SharePackagePrompt {
  title: string
  content: string
  category: string
  tags: string[]
  useCase?: string
  aiTarget?: string
  refinedVersion?: string
  createdAt: string
  updatedAt: string
}

export interface SharePackageV1 {
  schemaVersion: 'ampnotes.share.v1'
  createdAt: string
  source: {
    app: 'ampnotes'
    version: string
  }
  credits?: ExportCredits
  prompt: SharePackagePrompt
  checksum: string
}

export type ImportConflictStrategy = 'import_copy' | 'skip' | 'merge_metadata'

export interface ImportResult {
  imported: boolean
  reason?: string
  prompt?: PromptDTO
}

export interface SelectedExportBundle {
  schemaVersion: 'ampnotes.selection.export.v1'
  createdAt: string
  source: {
    app: 'ampnotes'
    version: string
  }
  credits?: ExportCredits
  prompts: SharePackageV1[]
  templates: Array<{
    id: string
    scope: 'system' | 'user'
    title: string
    content: string
    category?: string
    tags: string[]
  }>
}
