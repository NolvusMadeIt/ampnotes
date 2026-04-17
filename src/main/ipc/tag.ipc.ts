import { ipcMain } from 'electron'
import type { IpcContext } from './context'

export function registerTagIpc(context: IpcContext): void {
  ipcMain.handle('tag.list', (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    return context.promptRepo.listTags(request.profileId)
  })
}
