import type { IpcContext } from './context'
import { registerProfileIpc } from './profile.ipc'
import { registerPromptIpc } from './prompt.ipc'
import { registerRefineIpc } from './refine.ipc'
import { registerSearchIpc } from './search.ipc'
import { registerShareIpc } from './share.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerTagIpc } from './tag.ipc'
import { registerMarketplaceIpc } from './marketplace.ipc'

export function registerIpcHandlers(context: IpcContext): void {
  registerProfileIpc(context)
  registerPromptIpc(context)
  registerTagIpc(context)
  registerSearchIpc(context)
  registerRefineIpc(context)
  registerShareIpc(context)
  registerSettingsIpc(context)
  registerMarketplaceIpc(context)
}
