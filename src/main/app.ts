import { app, BrowserWindow } from 'electron'
import { closeDb, getDb } from '@main/db/client'
import { ProfileRepo, PromptRepo, SettingsRepo, TemplateRepo } from '@main/db/repos'
import { AIProviderRegistry } from '@main/ai/provider'
import { GroqProvider } from '@main/ai/providers/groq'
import { registerIpcHandlers } from '@main/ipc'
import { createMainWindow } from '@main/window'
import { handleInstallDeepLink, setProtocolHandler } from '@main/deepLink'
import { checkForUpdates, registerAppIpc } from '@main/updater'

let initialized = false

export async function bootstrapApp(): Promise<void> {
  if (initialized) {
    return
  }

  const db = getDb()
  const profileRepo = new ProfileRepo(db)
  const promptRepo = new PromptRepo(db)
  const templateRepo = new TemplateRepo(db)
  const settingsRepo = new SettingsRepo(db)

  const providers = new AIProviderRegistry()
  providers.register(new GroqProvider())

  registerAppIpc()
  registerIpcHandlers({
    db,
    profileRepo,
    promptRepo,
    templateRepo,
    settingsRepo,
    providers
  })

  const win = createMainWindow()
  setTimeout(() => {
    void checkForUpdates(true)
  }, 5000)
  setProtocolHandler(async (url) => {
    await handleInstallDeepLink(url, profileRepo, settingsRepo)
  })
  initialized = true
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDb()
    app.exit(0)
  }
})

app.on('before-quit', () => {
  closeDb()
})

app.on('activate', async () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) {
    await bootstrapApp()
  }
})
