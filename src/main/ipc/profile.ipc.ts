import { ipcMain } from 'electron'
import {
  createProfileSchema,
  signInSchema,
  updateThemeSchema
} from '@shared/contracts/ipc'
import type { IpcContext } from './context'

export function registerProfileIpc(context: IpcContext): void {
  ipcMain.handle('profile.list', () => context.profileRepo.listProfiles())

  ipcMain.handle('profile.getSession', () => {
    const session = context.profileRepo.getActiveSession()
    if (!session) {
      return null
    }

    context.promptRepo.ensureStarterPrompts(session.profileId)

    const profile = context.profileRepo.getProfileById(session.profileId)
    if (!profile) {
      return null
    }

    return { session, profile }
  })

  ipcMain.handle('profile.createAndSignIn', (_event, payload: unknown) => {
    const input = createProfileSchema.parse(payload)
    const profile = context.profileRepo.createProfile(input.displayName)
    const signedIn = context.profileRepo.signIn(profile.id)
    context.promptRepo.ensureStarterPrompts(signedIn.profile.id)
    return signedIn
  })

  ipcMain.handle('profile.signIn', (_event, payload: unknown) => {
    const input = signInSchema.parse(payload)
    const signedIn = context.profileRepo.signIn(input.profileId)
    context.promptRepo.ensureStarterPrompts(signedIn.profile.id)
    return signedIn
  })

  ipcMain.handle('profile.signOut', () => {
    context.profileRepo.signOut()
    return { ok: true }
  })

  ipcMain.handle('profile.updateTheme', (_event, payload: unknown) => {
    const input = updateThemeSchema.parse(payload)
    context.settingsRepo.setTheme(input.profileId, input.theme)
    return context.profileRepo.updateTheme(input.profileId, input.theme)
  })
}
