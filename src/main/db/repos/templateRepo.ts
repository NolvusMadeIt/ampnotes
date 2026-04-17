import { v4 as uuidv4 } from 'uuid'
import type { CreateTemplateInput, TemplateDTO, UpdateTemplateInput } from '@shared/types'
import type { SqliteDatabase } from '../client'

interface TemplateRow {
  id: string
  scope: 'system' | 'user'
  title: string
  content: string
  category: string | null
  tags_json: string | null
}

function toTemplateDTO(row: TemplateRow): TemplateDTO {
  return {
    id: row.id,
    scope: row.scope,
    title: row.title,
    content: row.content,
    category: row.category ?? undefined,
    tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : []
  }
}

function normalizeTags(tags?: string[]): string[] {
  const source = tags ?? []
  return [...new Set(source.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20)
}

const SYSTEM_TEMPLATES: Omit<TemplateDTO, 'id'>[] = [
  {
    scope: 'system',
    title: 'Bug Reproduction Prompt',
    content:
      'You are a senior debugger. Reproduce this bug step by step, identify likely root cause, and propose a minimal patch with test updates.\n\nContext: {{context}}\nError: {{error}}\nConstraints: {{constraints}}',
    category: 'Engineering',
    tags: ['debugging', 'engineering']
  },
  {
    scope: 'system',
    title: 'PR Review Prompt',
    content:
      'Review this pull request for correctness, regressions, security, and missing tests. Output findings ordered by severity with clear file/line references and suggested fixes.\n\nDiff: {{diff}}',
    category: 'Code Review',
    tags: ['review', 'quality']
  },
  {
    scope: 'system',
    title: 'Spec To Tasks Prompt',
    content:
      'Convert this product spec into implementation-ready engineering tasks. Include API changes, data model updates, edge cases, and test plan.\n\nSpec: {{spec}}',
    category: 'Planning',
    tags: ['planning', 'tasks']
  }
]

export function seedSystemTemplates(db: SqliteDatabase): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM templates').get() as
    | { count: number }
    | undefined
  if (count && count.count > 0) {
    return
  }

  const insertStmt = db.prepare(
    'INSERT INTO templates (id, scope, title, content, category, tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )

  const now = new Date().toISOString()
  for (const template of SYSTEM_TEMPLATES) {
    insertStmt.run(
      uuidv4(),
      template.scope,
      template.title,
      template.content,
      template.category ?? null,
      JSON.stringify(template.tags),
      now
    )
  }
}

export class TemplateRepo {
  constructor(private readonly db: SqliteDatabase) {}

  listTemplates(): TemplateDTO[] {
    const rows = this.db
      .prepare(
        'SELECT id, scope, title, content, category, tags_json FROM templates ORDER BY scope ASC, title ASC'
      )
      .all() as TemplateRow[]

    return rows.map(toTemplateDTO)
  }

  getTemplateById(id: string): TemplateDTO | null {
    const row = this.db
      .prepare('SELECT id, scope, title, content, category, tags_json FROM templates WHERE id = ?')
      .get(id) as TemplateRow | undefined

    return row ? toTemplateDTO(row) : null
  }

  listTemplatesByIds(templateIds: string[]): TemplateDTO[] {
    if (templateIds.length === 0) {
      return []
    }

    const placeholders = templateIds.map(() => '?').join(', ')
    const rows = this.db
      .prepare(
        `SELECT id, scope, title, content, category, tags_json
         FROM templates
         WHERE id IN (${placeholders})
         ORDER BY scope ASC, title ASC`
      )
      .all(...templateIds) as TemplateRow[]

    return rows.map(toTemplateDTO)
  }

  createTemplate(input: CreateTemplateInput): TemplateDTO {
    const id = uuidv4()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO templates (id, scope, title, content, category, tags_json, created_at)
         VALUES (?, 'user', ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.title.trim(),
        input.content.trim(),
        input.category?.trim() || null,
        JSON.stringify(normalizeTags(input.tags)),
        now
      )

    const created = this.getTemplateById(id)
    if (!created) {
      throw new Error('Failed to create template')
    }

    return created
  }

  updateTemplate(input: UpdateTemplateInput): TemplateDTO {
    const existing = this.getTemplateById(input.id)
    if (!existing) {
      throw new Error('Template not found')
    }
    if (existing.scope !== 'user') {
      throw new Error('System templates are read-only')
    }

    this.db
      .prepare(
        `UPDATE templates
         SET title = ?, content = ?, category = ?, tags_json = ?
         WHERE id = ? AND scope = 'user'`
      )
      .run(
        input.title.trim(),
        input.content.trim(),
        input.category?.trim() || null,
        JSON.stringify(normalizeTags(input.tags)),
        input.id
      )

    const updated = this.getTemplateById(input.id)
    if (!updated) {
      throw new Error('Failed to update template')
    }

    return updated
  }

  deleteTemplate(id: string): void {
    const existing = this.getTemplateById(id)
    if (!existing) {
      throw new Error('Template not found')
    }
    if (existing.scope !== 'user') {
      throw new Error('System templates cannot be deleted')
    }

    this.db.prepare('DELETE FROM templates WHERE id = ? AND scope = \'user\'').run(id)
  }
}
