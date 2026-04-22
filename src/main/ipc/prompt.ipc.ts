import { mkdirSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { app, ipcMain } from 'electron'
import { createPromptImageUrl } from '@main/promptImages'
import {
  createTemplateSchema,
  createPromptSchema,
  promptReorderSchema,
  promptValidationRequestSchema,
  promptListFiltersSchema,
  updateTemplateSchema,
  updatePromptSchema
} from '@shared/contracts/ipc'
import type { IpcContext } from './context'

const idSchema = {
  parse(payload: unknown): { id: string; profileId: string } {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload')
    }

    const value = payload as Record<string, unknown>
    if (typeof value.id !== 'string' || typeof value.profileId !== 'string') {
      throw new Error('Invalid payload')
    }

    return { id: value.id, profileId: value.profileId }
  }
}

const imageMimeExtensions: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) || 'image'
}

function parseImageDataUrl(dataUrl: string, mimeType: string): Buffer {
  const expectedPrefix = `data:${mimeType};base64,`
  if (!dataUrl.startsWith(expectedPrefix)) {
    throw new Error('Image payload is invalid.')
  }
  return Buffer.from(dataUrl.slice(expectedPrefix.length), 'base64')
}

export function registerPromptIpc(context: IpcContext): void {
  ipcMain.handle('prompt.list', (_event, payload: unknown) => {
    const request = payload as { profileId: string; filters?: unknown }
    const filters = promptListFiltersSchema.parse(request.filters ?? {})
    return context.promptRepo.listPrompts(request.profileId, filters)
  })

  ipcMain.handle('prompt.recent', (_event, payload: unknown) => {
    const request = payload as { profileId: string; limit?: number }
    return context.promptRepo.listRecent(request.profileId, request.limit ?? 12)
  })

  ipcMain.handle('prompt.tags', (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    return context.promptRepo.listTags(request.profileId)
  })

  ipcMain.handle('prompt.categories', (_event, payload: unknown) => {
    const request = payload as { profileId: string }
    return context.promptRepo.listCategories(request.profileId)
  })

  ipcMain.handle('prompt.getById', (_event, payload: unknown) => {
    const request = payload as { id: string }
    return context.promptRepo.getPromptById(request.id)
  })

  ipcMain.handle('prompt.create', (_event, payload: unknown) => {
    const request = payload as { profileId: string; input: unknown }
    const input = createPromptSchema.parse(request.input)
    return context.promptRepo.createPrompt(request.profileId, input)
  })

  ipcMain.handle('prompt.update', (_event, payload: unknown) => {
    const request = payload as { profileId: string; input: unknown }
    const input = updatePromptSchema.parse(request.input)
    return context.promptRepo.updatePrompt(request.profileId, input)
  })

  ipcMain.handle('prompt.reorder', (_event, payload: unknown) => {
    const request = promptReorderSchema.parse(payload)
    return context.promptRepo.reorderPrompts(request.profileId, request.promptIds)
  })

  ipcMain.handle('prompt.delete', (_event, payload: unknown) => {
    const request = idSchema.parse(payload)
    context.promptRepo.deletePrompt(request.profileId, request.id)
    return { ok: true }
  })

  ipcMain.handle('prompt.toggleFavorite', (_event, payload: unknown) => {
    const request = idSchema.parse(payload)
    return context.promptRepo.toggleFavorite(request.profileId, request.id)
  })

  ipcMain.handle('prompt.togglePinned', (_event, payload: unknown) => {
    const request = idSchema.parse(payload)
    return context.promptRepo.togglePinned(request.profileId, request.id)
  })

  ipcMain.handle('prompt.markUsed', (_event, payload: unknown) => {
    const request = idSchema.parse(payload)
    return context.promptRepo.markPromptUsed(request.profileId, request.id)
  })

  ipcMain.handle('prompt.versions', (_event, payload: unknown) => {
    const request = payload as { promptId: string }
    return context.promptRepo.listVersions(request.promptId)
  })

  ipcMain.handle('prompt.applyRefinement', (_event, payload: unknown) => {
    const request = payload as {
      profileId: string
      promptId: string
      refinedContent: string
      mode: 'replace' | 'variant'
      provider: string
      model: string
      notes?: string
    }

    return context.promptRepo.applyRefinedContent(
      request.profileId,
      request.promptId,
      request.refinedContent,
      request.mode,
      {
        provider: request.provider,
        model: request.model,
        notes: request.notes
      }
    )
  })

  ipcMain.handle('prompt.validateWithGroq', async (_event, payload: unknown) => {
    const request = promptValidationRequestSchema.parse(payload)
    const prompt = context.promptRepo.getPromptById(request.promptId)
    if (!prompt || prompt.profileId !== request.profileId) {
      throw new Error('Prompt not found')
    }

    const provider = context.providers.get('groq')
    const validation = await provider.validatePrompt({
      profileId: request.profileId,
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      useCase: prompt.useCase,
      aiTarget: prompt.aiTarget
    })

    return context.promptRepo.setPromptValidation(request.profileId, request.promptId, validation)
  })

  ipcMain.handle('prompt.saveImage', (_event, payload: unknown) => {
    const request = payload as {
      profileId?: string
      promptId?: string
      fileName?: string
      mimeType?: string
      dataUrl?: string
    }

    if (
      typeof request.profileId !== 'string' ||
      typeof request.promptId !== 'string' ||
      typeof request.fileName !== 'string' ||
      typeof request.mimeType !== 'string' ||
      typeof request.dataUrl !== 'string'
    ) {
      throw new Error('Invalid image payload.')
    }

    const extension = imageMimeExtensions[request.mimeType]
    if (!extension) {
      throw new Error('Only PNG, JPEG, WebP, and GIF images are supported.')
    }

    const prompt = context.promptRepo.getPromptById(request.promptId)
    if (!prompt || prompt.profileId !== request.profileId) {
      throw new Error('Prompt not found.')
    }

    const bytes = parseImageDataUrl(request.dataUrl, request.mimeType)
    const originalExt = extname(request.fileName).toLowerCase()
    const fileExt = originalExt && Object.values(imageMimeExtensions).includes(originalExt) ? originalExt : extension
    const baseName = safePathSegment(request.fileName.replace(/\.[^.]+$/, ''))
    const fileName = `${Date.now()}-${baseName}${fileExt}`
    const folderPath = join(app.getPath('userData'), 'prompt-images', safePathSegment(request.profileId), safePathSegment(request.promptId))
    mkdirSync(folderPath, { recursive: true })
    const filePath = join(folderPath, fileName)
    writeFileSync(filePath, bytes)
    const fileUrl = createPromptImageUrl(request.profileId, request.promptId, fileName)

    return {
      ok: true,
      markdown: `![${baseName}](${fileUrl})`,
      fileUrl,
      filePath
    }
  })

  ipcMain.handle('template.list', () => context.templateRepo.listTemplates())

  ipcMain.handle('template.create', (_event, payload: unknown) => {
    const request = payload as { input: unknown }
    const input = createTemplateSchema.parse(request.input)
    return context.templateRepo.createTemplate(input)
  })

  ipcMain.handle('template.update', (_event, payload: unknown) => {
    const request = payload as { input: unknown }
    const input = updateTemplateSchema.parse(request.input)
    return context.templateRepo.updateTemplate(input)
  })

  ipcMain.handle('template.delete', (_event, payload: unknown) => {
    const request = payload as { id: string }
    if (!request?.id || typeof request.id !== 'string') {
      throw new Error('Invalid template id')
    }
    context.templateRepo.deleteTemplate(request.id)
    return { ok: true }
  })
}
