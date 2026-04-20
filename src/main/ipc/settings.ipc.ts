import { ipcMain } from 'electron'
import { adminPinSchema, adminProfileSchema, themeSchema, updateAppearanceSchema } from '@shared/contracts/ipc'
import type { IpcContext } from './context'
import { keychainService } from '@main/security/keychain'

export function registerSettingsIpc(context: IpcContext): void {
  ipcMain.handle('settings.getTheme', (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    return context.settingsRepo.getTheme(request.profileId)
  })

  ipcMain.handle('settings.setTheme', (_event, payload: unknown) => {
    const request = payload as { profileId: string; theme: unknown }
    const theme = themeSchema.parse(request.theme)

    context.settingsRepo.setTheme(request.profileId, theme)
    return theme
  })

  ipcMain.handle('settings.getAppearance', (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    return context.settingsRepo.getAppearance(request.profileId)
  })

  ipcMain.handle('settings.setAppearance', (_event, payload: unknown) => {
    const request = updateAppearanceSchema.parse(payload)
    return context.settingsRepo.setAppearance(request.profileId, request.appearance)
  })

  ipcMain.handle('settings.getAdminProfile', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    const profile = context.settingsRepo.getAdminProfile(request.profileId)
    const hasAdminPin = await keychainService.hasAdminPin(request.profileId)
    if (profile.security.hasAdminPin !== hasAdminPin) {
      return context.settingsRepo.setAdminPinConfigured(request.profileId, hasAdminPin)
    }
    return profile
  })

  ipcMain.handle('settings.setAdminProfile', (_event, payload: unknown) => {
    const request = payload as { profileId: string; profile: unknown }
    const profile = adminProfileSchema.parse(request.profile)
    return context.settingsRepo.setAdminProfile(request.profileId, profile)
  })

  ipcMain.handle('settings.setAdminPin', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; pin: unknown }
    const pin = adminPinSchema.parse(request.pin)
    await keychainService.setAdminPin(request.profileId, pin)
    return context.settingsRepo.setAdminPinConfigured(request.profileId, true)
  })

  ipcMain.handle('settings.verifyAdminPin', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; pin: unknown }
    const pin = adminPinSchema.parse(request.pin)
    const ok = await keychainService.verifyAdminPin(request.profileId, pin)
    return { ok }
  })

  ipcMain.handle('settings.clearAdminPin', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    await keychainService.clearAdminPin(request.profileId)
    return context.settingsRepo.setAdminPinConfigured(request.profileId, false)
  })
}
