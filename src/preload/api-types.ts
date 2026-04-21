import type {
  AdminProfileDTO,
  AdminProfileInput,
  CreatePluginManifestInput,
  CreateThemeManifestInput,
  CreateTemplateInput,
  CreatePromptInput,
  ImportConflictStrategy,
  ImportResult,
  InstalledPluginDTO,
  InstalledThemeDTO,
  MarketplaceFolderResult,
  MarketplaceTransferResult,
  MarketplaceDeepLinkInstalledEvent,
  MarketplaceDeepLinkNoticeEvent,
  AppearanceSettingsDTO,
  MarketplaceStateDTO,
  ProfileDTO,
  PromptDTO,
  PromptListFilters,
  PromptVersionDTO,
  RefinementRequest,
  RefinementResult,
  SessionDTO,
  SharePackageV1,
  TemplateDTO,
  ThemeMode,
  UpdateTemplateInput,
  UpdatePromptInput
} from '@shared/types'

export interface ApiClient {
  app: {
    getInfo: () => Promise<{ version: string }>
    checkForUpdates: () => Promise<{
      ok: boolean
      updateAvailable: boolean
      currentVersion: string
      latestVersion?: string
      releaseUrl?: string
      reason?: string
    }>
  }
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
  }
  profile: {
    list: () => Promise<ProfileDTO[]>
    getSession: () => Promise<{ profile: ProfileDTO; session: SessionDTO } | null>
    createAndSignIn: (displayName: string) => Promise<{ profile: ProfileDTO; session: SessionDTO }>
    signIn: (profileId: string) => Promise<{ profile: ProfileDTO; session: SessionDTO }>
    signOut: () => Promise<{ ok: boolean }>
    updateTheme: (profileId: string, theme: ThemeMode) => Promise<ProfileDTO>
  }
  prompt: {
    list: (profileId: string, filters?: PromptListFilters) => Promise<PromptDTO[]>
    recent: (profileId: string, limit?: number) => Promise<PromptDTO[]>
    tags: (profileId: string) => Promise<Array<{ name: string; count: number }>>
    categories: (profileId: string) => Promise<Array<{ name: string; count: number }>>
    getById: (id: string) => Promise<PromptDTO | null>
    create: (profileId: string, input: CreatePromptInput) => Promise<PromptDTO>
    update: (profileId: string, input: UpdatePromptInput) => Promise<PromptDTO>
    reorder: (profileId: string, promptIds: string[]) => Promise<PromptDTO[]>
    delete: (profileId: string, id: string) => Promise<{ ok: boolean }>
    toggleFavorite: (profileId: string, id: string) => Promise<PromptDTO>
    togglePinned: (profileId: string, id: string) => Promise<PromptDTO>
    markUsed: (profileId: string, id: string) => Promise<PromptDTO>
    versions: (promptId: string) => Promise<PromptVersionDTO[]>
    applyRefinement: (input: {
      profileId: string
      promptId: string
      refinedContent: string
      mode: 'replace' | 'variant'
      provider: string
      model: string
      notes?: string
    }) => Promise<PromptDTO>
    validateWithGroq: (profileId: string, promptId: string) => Promise<PromptDTO>
  }
  tag: {
    list: (profileId: string) => Promise<Array<{ name: string; count: number }>>
  }
  search: {
    query: (profileId: string, query?: string, filters?: PromptListFilters) => Promise<PromptDTO[]>
  }
  template: {
    list: () => Promise<TemplateDTO[]>
    create: (input: CreateTemplateInput) => Promise<TemplateDTO>
    update: (input: UpdateTemplateInput) => Promise<TemplateDTO>
    delete: (id: string) => Promise<{ ok: boolean }>
  }
  refine: {
    providers: () => Promise<string[]>
    isConfigured: (profileId: string, providerId?: string) => Promise<boolean>
    saveApiKey: (profileId: string, apiKey: string) => Promise<{ ok: boolean }>
    clearApiKey: (profileId: string) => Promise<{ ok: boolean }>
    prompt: (request: RefinementRequest) => Promise<RefinementResult>
  }
  share: {
    generateCode: (promptId: string) => Promise<{ encoded: string; package: SharePackageV1 }>
    exportPrompt: (
      profileId: string,
      promptId: string,
      format: 'json' | 'txt'
    ) => Promise<{ ok: boolean; filePath?: string }>
    importCode: (
      profileId: string,
      encoded: string,
      strategy?: ImportConflictStrategy
    ) => Promise<ImportResult>
    importFile: (profileId: string) => Promise<ImportResult>
    exportSelected: (
      profileId: string,
      selection: { promptIds: string[]; templateIds: string[] }
    ) => Promise<{ ok: boolean; filePath?: string }>
  }
  settings: {
    getTheme: (profileId: string) => Promise<ThemeMode>
    setTheme: (profileId: string, theme: ThemeMode) => Promise<ThemeMode>
    getAppearance: (profileId: string) => Promise<AppearanceSettingsDTO>
    setAppearance: (profileId: string, appearance: AppearanceSettingsDTO) => Promise<AppearanceSettingsDTO>
    getAdminProfile: (profileId: string) => Promise<AdminProfileDTO>
    setAdminProfile: (profileId: string, profile: AdminProfileInput) => Promise<AdminProfileDTO>
    setAdminPin: (profileId: string, pin: string) => Promise<AdminProfileDTO>
    verifyAdminPin: (profileId: string, pin: string) => Promise<{ ok: boolean }>
    clearAdminPin: (profileId: string) => Promise<AdminProfileDTO>
  }
  marketplace: {
    getState: (profileId: string) => Promise<MarketplaceStateDTO>
    installCode: (
      profileId: string,
      kind: 'plugin' | 'theme',
      code: string
    ) => Promise<MarketplaceDeepLinkInstalledEvent>
    registerPlugin: (profileId: string, manifest: CreatePluginManifestInput) => Promise<InstalledPluginDTO>
    importPluginManifestFile: (profileId: string) => Promise<MarketplaceTransferResult>
    importPluginFromFolder: (profileId: string) => Promise<MarketplaceTransferResult>
    exportPluginManifest: (profileId: string, pluginId: string) => Promise<MarketplaceTransferResult>
    setPluginEnabled: (profileId: string, pluginId: string, enabled: boolean) => Promise<InstalledPluginDTO>
    removePlugin: (profileId: string, pluginId: string) => Promise<{ ok: boolean }>
    openPluginFolder: (profileId: string, pluginId: string) => Promise<MarketplaceFolderResult>
    registerTheme: (profileId: string, manifest: CreateThemeManifestInput) => Promise<InstalledThemeDTO>
    importThemeManifestFile: (profileId: string) => Promise<MarketplaceTransferResult>
    importThemeFromFolder: (profileId: string) => Promise<MarketplaceTransferResult>
    exportThemeManifest: (profileId: string, themeId: string) => Promise<MarketplaceTransferResult>
    setActiveTheme: (profileId: string, themeId: string | null) => Promise<string | null>
    removeTheme: (profileId: string, themeId: string) => Promise<{ ok: boolean }>
    openThemeFolder: (profileId: string, themeId: string) => Promise<MarketplaceFolderResult>
    onDeepLinkInstalled: (callback: (event: MarketplaceDeepLinkInstalledEvent) => void) => () => void
    onDeepLinkNotice: (callback: (event: MarketplaceDeepLinkNoticeEvent) => void) => () => void
  }
}
