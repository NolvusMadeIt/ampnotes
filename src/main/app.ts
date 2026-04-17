import { app, BrowserWindow } from 'electron'
import { getDb } from '@main/db/client'
import { ProfileRepo, PromptRepo, SettingsRepo, TemplateRepo } from '@main/db/repos'
import { AIProviderRegistry } from '@main/ai/provider'
import { GroqProvider } from '@main/ai/providers/groq'
import { registerIpcHandlers } from '@main/ipc'
import { createMainWindow } from '@main/window'

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

  registerIpcHandlers({
    db,
    profileRepo,
    promptRepo,
    templateRepo,
    settingsRepo,
    providers
  })

  createMainWindow()
  initialized = true
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) {
    await bootstrapApp()
  }
})
