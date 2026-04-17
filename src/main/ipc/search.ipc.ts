import { ipcMain } from 'electron'
import { promptListFiltersSchema } from '@shared/contracts/ipc'
import type { IpcContext } from './context'

export function registerSearchIpc(context: IpcContext): void {
  ipcMain.handle('search.query', (_event, payload: unknown) => {
    const request = payload as { profileId: string; query?: string; filters?: unknown }
    const filters = promptListFiltersSchema.parse(request.filters ?? {})
    return context.promptRepo.listPrompts(request.profileId, {
      ...filters,
      search: request.query ?? filters.search
    })
  })
}
