import { ipcMain } from 'electron'
import { themeSchema, updateAppearanceSchema } from '@shared/contracts/ipc'
import type { IpcContext } from './context'

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
}
