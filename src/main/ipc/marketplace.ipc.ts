import { ipcMain, shell } from 'electron'
import { pluginManifestSchema, themeManifestSchema } from '@shared/contracts/ipc'
import type { IpcContext } from './context'
import { normalizePluginManifest, normalizeThemeManifest } from '@main/db/repos/settingsRepo'

export function registerMarketplaceIpc(context: IpcContext): void {
  ipcMain.handle('marketplace.getState', (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    return context.settingsRepo.getMarketplaceState(request.profileId)
  })

  ipcMain.handle('marketplace.registerPlugin', (_event, payload: unknown) => {
    const request = payload as { profileId: string; manifest: unknown }
    const manifest = normalizePluginManifest(pluginManifestSchema.parse(request.manifest))
    return context.settingsRepo.registerPlugin(request.profileId, manifest)
  })

  ipcMain.handle('marketplace.setPluginEnabled', (_event, payload: unknown) => {
    const request = payload as { profileId: string; pluginId: string; enabled: boolean }
    if (typeof request.profileId !== 'string' || typeof request.pluginId !== 'string' || typeof request.enabled !== 'boolean') {
      throw new Error('Invalid payload')
    }
    return context.settingsRepo.setPluginEnabled(request.profileId, request.pluginId, request.enabled)
  })

  ipcMain.handle('marketplace.removePlugin', (_event, payload: unknown) => {
    const request = payload as { profileId: string; pluginId: string }
    if (typeof request.profileId !== 'string' || typeof request.pluginId !== 'string') {
      throw new Error('Invalid payload')
    }
    context.settingsRepo.removePlugin(request.profileId, request.pluginId)
    return { ok: true }
  })

  ipcMain.handle('marketplace.openPluginFolder', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; pluginId: string }
    if (typeof request.profileId !== 'string' || typeof request.pluginId !== 'string') {
      throw new Error('Invalid payload')
    }
    const folderPath = context.settingsRepo.ensurePluginPackage(request.profileId, request.pluginId)
    const error = await shell.openPath(folderPath)
    if (error) {
      throw new Error(error)
    }
    return { ok: true, folderPath }
  })

  ipcMain.handle('marketplace.registerTheme', (_event, payload: unknown) => {
    const request = payload as { profileId: string; manifest: unknown }
    const manifest = normalizeThemeManifest(themeManifestSchema.parse(request.manifest))
    return context.settingsRepo.registerTheme(request.profileId, manifest)
  })

  ipcMain.handle('marketplace.setActiveTheme', (_event, payload: unknown) => {
    const request = payload as { profileId: string; themeId: string | null }
    if (typeof request.profileId !== 'string') {
      throw new Error('Invalid payload')
    }
    if (request.themeId !== null && typeof request.themeId !== 'string') {
      throw new Error('Invalid payload')
    }
    return context.settingsRepo.setActiveMarketplaceTheme(request.profileId, request.themeId)
  })

  ipcMain.handle('marketplace.removeTheme', (_event, payload: unknown) => {
    const request = payload as { profileId: string; themeId: string }
    if (typeof request.profileId !== 'string' || typeof request.themeId !== 'string') {
      throw new Error('Invalid payload')
    }
    context.settingsRepo.removeTheme(request.profileId, request.themeId)
    return { ok: true }
  })

  ipcMain.handle('marketplace.openThemeFolder', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; themeId: string }
    if (typeof request.profileId !== 'string' || typeof request.themeId !== 'string') {
      throw new Error('Invalid payload')
    }
    const folderPath = context.settingsRepo.ensureThemePackage(request.profileId, request.themeId)
    const error = await shell.openPath(folderPath)
    if (error) {
      throw new Error(error)
    }
    return { ok: true, folderPath }
  })
}
