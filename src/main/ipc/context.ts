import { AIProviderRegistry } from '@main/ai/provider'
import { ProfileRepo, PromptRepo, SettingsRepo, TemplateRepo } from '@main/db/repos'
import type { SqliteDatabase } from '@main/db/client'

export interface IpcContext {
  db: SqliteDatabase
  profileRepo: ProfileRepo
  promptRepo: PromptRepo
  templateRepo: TemplateRepo
  settingsRepo: SettingsRepo
  providers: AIProviderRegistry
}
