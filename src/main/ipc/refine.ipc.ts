import { ipcMain } from 'electron'
import { refineRequestSchema, saveApiKeySchema } from '@shared/contracts/ipc'
import { keychainService } from '@main/security/keychain'
import type { IpcContext } from './context'

export function registerRefineIpc(context: IpcContext): void {
  ipcMain.handle('refine.providers', () => context.providers.list())

  ipcMain.handle('refine.isConfigured', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; providerId?: string }
    const provider = context.providers.get(request.providerId ?? 'groq')
    return provider.isConfigured(request.profileId)
  })

  ipcMain.handle('refine.saveApiKey', async (_event, payload: unknown) => {
    const input = saveApiKeySchema.parse(payload)
    await keychainService.setGroqApiKey(input.profileId, input.apiKey)
    return { ok: true }
  })

  ipcMain.handle('refine.clearApiKey', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    await keychainService.clearGroqApiKey(request.profileId)
    return { ok: true }
  })

  ipcMain.handle('refine.prompt', async (_event, payload: unknown) => {
    const input = refineRequestSchema.parse(payload)
    const provider = context.providers.get('groq')
    return provider.refinePrompt(input)
  })
}
