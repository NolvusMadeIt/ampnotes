import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dialog, ipcMain, shell } from 'electron'
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

  ipcMain.handle('marketplace.importPluginManifestFile', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    if (typeof request.profileId !== 'string') {
      throw new Error('Invalid payload')
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Plugin Manifest',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || filePaths.length === 0) {
      return { ok: false, canceled: true }
    }

    const filePath = filePaths[0]
    const raw = readFileSync(filePath, 'utf8')
    const manifest = normalizePluginManifest(pluginManifestSchema.parse(JSON.parse(raw)))
    context.settingsRepo.registerPlugin(request.profileId, manifest, 'local')
    return { ok: true, filePath }
  })

  ipcMain.handle('marketplace.importPluginFromFolder', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    if (typeof request.profileId !== 'string') {
      throw new Error('Invalid payload')
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Plugin From Folder',
      properties: ['openDirectory']
    })
    if (canceled || filePaths.length === 0) {
      return { ok: false, canceled: true }
    }

    const folderPath = filePaths[0]
    const manifestPath = join(folderPath, 'manifest.json')
    if (!existsSync(manifestPath)) {
      throw new Error('manifest.json was not found in the selected folder')
    }

    const raw = readFileSync(manifestPath, 'utf8')
    const manifest = normalizePluginManifest(pluginManifestSchema.parse(JSON.parse(raw)))
    context.settingsRepo.registerPlugin(request.profileId, manifest, 'local')
    return { ok: true, folderPath }
  })

  ipcMain.handle('marketplace.exportPluginManifest', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; pluginId: string }
    if (typeof request.profileId !== 'string' || typeof request.pluginId !== 'string') {
      throw new Error('Invalid payload')
    }

    const plugin = context
      .settingsRepo
      .getMarketplaceState(request.profileId)
      .plugins
      .find((item) => item.id === request.pluginId)
    if (!plugin) {
      throw new Error('Plugin not found')
    }

    const defaultName = `${plugin.id.replace(/[^a-z0-9._-]/gi, '_')}.plugin.json`
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Plugin Manifest',
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) {
      return { ok: false, canceled: true }
    }

    writeFileSync(
      filePath,
      `${JSON.stringify(
        {
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          description: plugin.description,
          author: plugin.author,
          entry: plugin.entry,
          homepage: plugin.homepage,
          permissions: plugin.permissions
        },
        null,
        2
      )}\n`,
      'utf8'
    )
    return { ok: true, filePath }
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

  ipcMain.handle('marketplace.importThemeManifestFile', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    if (typeof request.profileId !== 'string') {
      throw new Error('Invalid payload')
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Theme Manifest',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || filePaths.length === 0) {
      return { ok: false, canceled: true }
    }

    const filePath = filePaths[0]
    const raw = readFileSync(filePath, 'utf8')
    const manifest = normalizeThemeManifest(themeManifestSchema.parse(JSON.parse(raw)))
    context.settingsRepo.registerTheme(request.profileId, manifest, 'local')
    return { ok: true, filePath }
  })

  ipcMain.handle('marketplace.importThemeFromFolder', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    if (typeof request.profileId !== 'string') {
      throw new Error('Invalid payload')
    }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Theme From Folder',
      properties: ['openDirectory']
    })
    if (canceled || filePaths.length === 0) {
      return { ok: false, canceled: true }
    }

    const folderPath = filePaths[0]
    const manifestPath = join(folderPath, 'manifest.json')
    if (!existsSync(manifestPath)) {
      throw new Error('manifest.json was not found in the selected folder')
    }

    const raw = readFileSync(manifestPath, 'utf8')
    const manifest = normalizeThemeManifest(themeManifestSchema.parse(JSON.parse(raw)))
    context.settingsRepo.registerTheme(request.profileId, manifest, 'local')
    return { ok: true, folderPath }
  })

  ipcMain.handle('marketplace.exportThemeManifest', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; themeId: string }
    if (typeof request.profileId !== 'string' || typeof request.themeId !== 'string') {
      throw new Error('Invalid payload')
    }

    const theme = context
      .settingsRepo
      .getMarketplaceState(request.profileId)
      .themes
      .find((item) => item.id === request.themeId)
    if (!theme) {
      throw new Error('Theme not found')
    }

    const defaultName = `${theme.id.replace(/[^a-z0-9._-]/gi, '_')}.theme.json`
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Theme Manifest',
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || !filePath) {
      return { ok: false, canceled: true }
    }

    writeFileSync(
      filePath,
      `${JSON.stringify(
        {
          id: theme.id,
          name: theme.name,
          version: theme.version,
          description: theme.description,
          author: theme.author,
          homepage: theme.homepage,
          tokens: theme.tokens
        },
        null,
        2
      )}\n`,
      'utf8'
    )
    return { ok: true, filePath }
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
