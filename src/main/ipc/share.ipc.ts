import { readFileSync, writeFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { dialog, ipcMain } from 'electron'
import { shareImportSchema, shareSelectedExportSchema } from '@shared/contracts/ipc'
import { formatPromptValidationIssues, validatePromptForShare } from '@shared/validation/prompt'
import type { IpcContext } from './context'
import { createSharePackage, encodeSharePackage } from '@main/share/encoder'
import { decodeSharePackage } from '@main/share/decoder'
import { getSharePayloadHash, scanPayloadForThreats, validateSharePackage } from '@main/share/validation'
import type { ExportCredits, SelectedExportBundle } from '@shared/types'

function contentHash(title: string, content: string): string {
  return createHash('sha256').update(`${title}::${content}`).digest('hex')
}

export function registerShareIpc(context: IpcContext): void {
  const resolveCredits = (profileId: string): ExportCredits | undefined => {
    const admin = context.settingsRepo.getAdminProfile(profileId)
    const creditsName = admin.displayName?.trim()
    if (!creditsName) {
      return undefined
    }
    return {
      name: creditsName,
      socials: admin.socials
    }
  }

  ipcMain.handle('share.generateCode', (_event, payload: unknown) => {
    const request = payload as { promptId: string }
    const prompt = context.promptRepo.getPromptById(request.promptId)
    if (!prompt) {
      throw new Error('Prompt not found')
    }
    const issues = validatePromptForShare(prompt)
    if (issues.length > 0) {
      throw new Error(formatPromptValidationIssues(issues))
    }

    const pkg = createSharePackage(prompt, resolveCredits(prompt.profileId))
    return {
      encoded: encodeSharePackage(pkg),
      package: pkg
    }
  })

  ipcMain.handle('share.exportPrompt', async (_event, payload: unknown) => {
    const request = payload as { profileId: string; promptId: string; format: 'json' | 'txt' }
    const prompt = context.promptRepo.getPromptById(request.promptId)
    if (!prompt) {
      throw new Error('Prompt not found')
    }
    const issues = validatePromptForShare(prompt)
    if (issues.length > 0) {
      throw new Error(formatPromptValidationIssues(issues))
    }

    const pkg = createSharePackage(prompt, resolveCredits(prompt.profileId))
    const scan = scanPayloadForThreats(JSON.stringify(pkg))
    if (!scan.ok) {
      throw new Error(scan.reason ?? 'Security scan failed')
    }
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Prompt',
      defaultPath: `${prompt.title.replace(/\s+/g, '-').toLowerCase()}.${request.format === 'json' ? 'json' : 'txt'}`,
      filters:
        request.format === 'json'
          ? [{ name: 'JSON', extensions: ['json'] }]
          : [{ name: 'Text', extensions: ['txt'] }]
    })

    if (canceled || !filePath) {
      return { ok: false }
    }

    if (request.format === 'json') {
      writeFileSync(filePath, JSON.stringify(pkg, null, 2), 'utf8')
    } else {
      writeFileSync(filePath, prompt.content, 'utf8')
    }

    context.db
      .prepare(
        'INSERT INTO exports (id, profile_id, prompt_id, export_type, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(randomUUID(), request.profileId, request.promptId, request.format, new Date().toISOString())

    return { ok: true, filePath }
  })

  ipcMain.handle('share.exportSelected', async (_event, payload: unknown) => {
    const request = shareSelectedExportSchema.parse(payload)
    if (request.promptIds.length === 0 && request.templateIds.length === 0) {
      throw new Error('Select at least one prompt or template to export')
    }

    const prompts = context.promptRepo.listPromptsByIds(request.profileId, request.promptIds)
    const templates = context.templateRepo.listTemplatesByIds(request.templateIds)

    const missingPrompts = request.promptIds.filter((id) => !prompts.some((prompt) => prompt.id === id))
    const missingTemplates = request.templateIds.filter((id) => !templates.some((template) => template.id === id))
    if (missingPrompts.length > 0 || missingTemplates.length > 0) {
      throw new Error('Some selected items are no longer available')
    }

    const invalidPrompt = prompts.find((prompt) => validatePromptForShare(prompt).length > 0)
    if (invalidPrompt) {
      const issues = validatePromptForShare(invalidPrompt)
      throw new Error(
        `Prompt "${invalidPrompt.title}" is not ready for export. ${formatPromptValidationIssues(issues)}`
      )
    }

    const bundle: SelectedExportBundle = {
      schemaVersion: 'ampnotes.selection.export.v1',
      createdAt: new Date().toISOString(),
      source: {
        app: 'ampnotes',
        version: '0.1.3'
      },
      credits: resolveCredits(request.profileId),
      prompts: prompts.map((prompt) => createSharePackage(prompt, resolveCredits(prompt.profileId))),
      templates: templates.map((template) => ({
        id: template.id,
        scope: template.scope,
        title: template.title,
        content: template.content,
        category: template.category,
        tags: template.tags
      }))
    }
    const scan = scanPayloadForThreats(JSON.stringify(bundle))
    if (!scan.ok) {
      throw new Error(scan.reason ?? 'Security scan failed')
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Selected Items',
      defaultPath: 'ampnotes-selected-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (canceled || !filePath) {
      return { ok: false }
    }

    writeFileSync(filePath, JSON.stringify(bundle, null, 2), 'utf8')
    return { ok: true, filePath }
  })

  ipcMain.handle('share.importCode', (_event, payload: unknown) => {
    const request = shareImportSchema.parse(payload)
    const parsed = validateSharePackage(decodeSharePackage(request.encoded))
    const scan = scanPayloadForThreats(JSON.stringify(parsed))
    if (!scan.ok) {
      throw new Error(scan.reason ?? 'Security scan failed')
    }

    const duplicate = context.promptRepo.findDuplicate(
      request.profileId,
      parsed.prompt.title,
      parsed.prompt.content
    )

    if (duplicate && request.strategy === 'skip') {
      return { imported: false, reason: 'duplicate_skipped' }
    }

    if (duplicate && request.strategy === 'merge_metadata') {
      const merged = context.promptRepo.updatePrompt(request.profileId, {
        id: duplicate.id,
        title: duplicate.title,
        content: duplicate.content,
        category: duplicate.category,
        tags: [...new Set([...duplicate.tags, ...parsed.prompt.tags])],
        useCase: duplicate.useCase ?? parsed.prompt.useCase,
        aiTarget: duplicate.aiTarget ?? parsed.prompt.aiTarget,
        favorite: duplicate.favorite,
        pinned: duplicate.pinned
      })

      context.db
        .prepare(
          'INSERT INTO imports (id, profile_id, source_type, payload_hash, imported_at, result_json) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          randomUUID(),
          request.profileId,
          'share_code',
          getSharePayloadHash(parsed),
          new Date().toISOString(),
          JSON.stringify({ strategy: request.strategy, mergedPromptId: merged.id })
        )

      return { imported: true, prompt: merged }
    }

    const title = duplicate
      ? `${parsed.prompt.title} (Imported)`
      : parsed.prompt.title

    const created = context.promptRepo.createPrompt(request.profileId, {
      title,
      content: parsed.prompt.content,
      category: parsed.prompt.category,
      tags: parsed.prompt.tags,
      useCase: parsed.prompt.useCase,
      aiTarget: parsed.prompt.aiTarget
    })

    context.db
      .prepare(
        'INSERT INTO imports (id, profile_id, source_type, payload_hash, imported_at, result_json) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        randomUUID(),
        request.profileId,
        'share_code',
        contentHash(parsed.prompt.title, parsed.prompt.content),
        new Date().toISOString(),
        JSON.stringify({ strategy: request.strategy, importedPromptId: created.id })
      )

    return { imported: true, prompt: created }
  })

  ipcMain.handle('share.importFile', async (_event, payload: unknown) => {
    const request = payload as { profileId: string }

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Prompt',
      properties: ['openFile'],
      filters: [
        { name: 'Supported', extensions: ['json', 'txt'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt'] }
      ]
    })

    if (canceled || filePaths.length === 0) {
      return { imported: false, reason: 'canceled' }
    }

    const filePath = filePaths[0]
    const ext = extname(filePath).toLowerCase()
    const raw = readFileSync(filePath, 'utf8')

    let created
    if (ext === '.json') {
      const parsed = validateSharePackage(JSON.parse(raw))
      const scan = scanPayloadForThreats(JSON.stringify(parsed))
      if (!scan.ok) {
        throw new Error(scan.reason ?? 'Security scan failed')
      }
      created = context.promptRepo.createPrompt(request.profileId, {
        title: parsed.prompt.title,
        content: parsed.prompt.content,
        category: parsed.prompt.category,
        tags: parsed.prompt.tags,
        useCase: parsed.prompt.useCase,
        aiTarget: parsed.prompt.aiTarget
      })
    } else {
      const baseName = basename(filePath, ext)
      created = context.promptRepo.createPrompt(request.profileId, {
        title: baseName,
        content: raw,
        category: 'Imported',
        tags: ['imported']
      })
    }

    return { imported: true, prompt: created }
  })
}
