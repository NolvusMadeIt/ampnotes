import { contextBridge, ipcRenderer } from 'electron'
import type { ApiClient } from './api-types'

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return ipcRenderer.invoke(channel, payload)
}

const api: ApiClient = {
  app: {
    getInfo: () => invoke('app.getInfo'),
    checkForUpdates: () => invoke('app.checkForUpdates')
  },
  window: {
    minimize: () => invoke('window.minimize'),
    toggleMaximize: () => invoke('window.toggleMaximize'),
    close: () => invoke('window.close')
  },
  profile: {
    list: () => invoke('profile.list'),
    getSession: () => invoke('profile.getSession'),
    createAndSignIn: (displayName) => invoke('profile.createAndSignIn', { displayName }),
    signIn: (profileId) => invoke('profile.signIn', { profileId }),
    signOut: () => invoke('profile.signOut'),
    updateTheme: (profileId, theme) => invoke('profile.updateTheme', { profileId, theme })
  },
  prompt: {
    list: (profileId, filters) => invoke('prompt.list', { profileId, filters }),
    recent: (profileId, limit) => invoke('prompt.recent', { profileId, limit }),
    tags: (profileId) => invoke('prompt.tags', { profileId }),
    categories: (profileId) => invoke('prompt.categories', { profileId }),
    getById: (id) => invoke('prompt.getById', { id }),
    create: (profileId, input) => invoke('prompt.create', { profileId, input }),
    update: (profileId, input) => invoke('prompt.update', { profileId, input }),
    reorder: (profileId, promptIds) => invoke('prompt.reorder', { profileId, promptIds }),
    delete: (profileId, id) => invoke('prompt.delete', { profileId, id }),
    toggleFavorite: (profileId, id) => invoke('prompt.toggleFavorite', { profileId, id }),
    togglePinned: (profileId, id) => invoke('prompt.togglePinned', { profileId, id }),
    markUsed: (profileId, id) => invoke('prompt.markUsed', { profileId, id }),
    versions: (promptId) => invoke('prompt.versions', { promptId }),
    applyRefinement: (input) => invoke('prompt.applyRefinement', input),
    validateWithGroq: (profileId, promptId) => invoke('prompt.validateWithGroq', { profileId, promptId })
  },
  tag: {
    list: (profileId) => invoke('tag.list', { profileId })
  },
  search: {
    query: (profileId, query, filters) => invoke('search.query', { profileId, query, filters })
  },
  template: {
    list: () => invoke('template.list'),
    create: (input) => invoke('template.create', { input }),
    update: (input) => invoke('template.update', { input }),
    delete: (id) => invoke('template.delete', { id })
  },
  refine: {
    providers: () => invoke('refine.providers'),
    isConfigured: (profileId, providerId) => invoke('refine.isConfigured', { profileId, providerId }),
    saveApiKey: (profileId, apiKey) => invoke('refine.saveApiKey', { profileId, apiKey }),
    clearApiKey: (profileId) => invoke('refine.clearApiKey', { profileId }),
    prompt: (request) => invoke('refine.prompt', request)
  },
  share: {
    generateCode: (promptId) => invoke('share.generateCode', { promptId }),
    exportPrompt: (profileId, promptId, format) =>
      invoke('share.exportPrompt', { profileId, promptId, format }),
    importCode: (profileId, encoded, strategy = 'import_copy') =>
      invoke('share.importCode', { profileId, encoded, strategy }),
    importFile: (profileId) => invoke('share.importFile', { profileId }),
    exportSelected: (profileId, selection) =>
      invoke('share.exportSelected', {
        profileId,
        promptIds: selection.promptIds,
        templateIds: selection.templateIds
      })
  },
  settings: {
    getTheme: (profileId) => invoke('settings.getTheme', { profileId }),
    setTheme: (profileId, theme) => invoke('settings.setTheme', { profileId, theme }),
    getAppearance: (profileId) => invoke('settings.getAppearance', { profileId }),
    setAppearance: (profileId, appearance) => invoke('settings.setAppearance', { profileId, appearance }),
    getAdminProfile: (profileId) => invoke('settings.getAdminProfile', { profileId }),
    setAdminProfile: (profileId, profile) => invoke('settings.setAdminProfile', { profileId, profile }),
    setAdminPin: (profileId, pin) => invoke('settings.setAdminPin', { profileId, pin }),
    verifyAdminPin: (profileId, pin) => invoke('settings.verifyAdminPin', { profileId, pin }),
    clearAdminPin: (profileId) => invoke('settings.clearAdminPin', { profileId })
  },
  marketplace: {
    getState: (profileId) => invoke('marketplace.getState', { profileId }),
    installCode: (profileId, kind, code) => invoke('marketplace.installCode', { profileId, kind, code }),
    registerPlugin: (profileId, manifest) => invoke('marketplace.registerPlugin', { profileId, manifest }),
    importPluginManifestFile: (profileId) => invoke('marketplace.importPluginManifestFile', { profileId }),
    importPluginFromFolder: (profileId) => invoke('marketplace.importPluginFromFolder', { profileId }),
    exportPluginManifest: (profileId, pluginId) =>
      invoke('marketplace.exportPluginManifest', { profileId, pluginId }),
    setPluginEnabled: (profileId, pluginId, enabled) =>
      invoke('marketplace.setPluginEnabled', { profileId, pluginId, enabled }),
    removePlugin: (profileId, pluginId) => invoke('marketplace.removePlugin', { profileId, pluginId }),
    openPluginFolder: (profileId, pluginId) => invoke('marketplace.openPluginFolder', { profileId, pluginId }),
    registerTheme: (profileId, manifest) => invoke('marketplace.registerTheme', { profileId, manifest }),
    importThemeManifestFile: (profileId) => invoke('marketplace.importThemeManifestFile', { profileId }),
    importThemeFromFolder: (profileId) => invoke('marketplace.importThemeFromFolder', { profileId }),
    exportThemeManifest: (profileId, themeId) =>
      invoke('marketplace.exportThemeManifest', { profileId, themeId }),
    setActiveTheme: (profileId, themeId) => invoke('marketplace.setActiveTheme', { profileId, themeId }),
    removeTheme: (profileId, themeId) => invoke('marketplace.removeTheme', { profileId, themeId }),
    openThemeFolder: (profileId, themeId) => invoke('marketplace.openThemeFolder', { profileId, themeId }),
    onDeepLinkInstalled: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
        callback(payload as Parameters<typeof callback>[0])
      }
      ipcRenderer.on('marketplace.deepLinkInstalled', listener)
      return () => {
        ipcRenderer.removeListener('marketplace.deepLinkInstalled', listener)
      }
    },
    onDeepLinkNotice: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
        callback(payload as Parameters<typeof callback>[0])
      }
      ipcRenderer.on('marketplace.deepLinkNotice', listener)
      return () => {
        ipcRenderer.removeListener('marketplace.deepLinkNotice', listener)
      }
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
