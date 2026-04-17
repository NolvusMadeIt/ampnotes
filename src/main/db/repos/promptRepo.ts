import { v4 as uuidv4 } from 'uuid'
import type {
  CreatePromptInput,
  PromptValidationResult,
  PromptDTO,
  PromptListFilters,
  PromptVersionDTO,
  UpdatePromptInput
} from '@shared/types'
import { formatPromptValidationIssues, validatePromptForSave } from '@shared/validation/prompt'
import type { SqliteDatabase } from '../client'

interface PromptRow {
  id: string
  profile_id: string
  title: string
  content: string
  category: string
  use_case: string | null
  ai_target: string | null
  refined_version: string | null
  favorite: number
  pinned: number
  created_at: string
  updated_at: string
  last_used_at: string | null
  use_count: number
  display_order: number | null
  tags_csv: string | null
  validated_at: string | null
  validation_provider: string | null
  validation_model: string | null
  validation_notes: string | null
}

interface PromptVersionRow {
  id: string
  prompt_id: string
  version_type: 'original' | 'refined' | 'manual'
  content: string
  provider: string | null
  model: string | null
  metadata_json: string | null
  created_at: string
}

function normalizeTags(tags?: string[]): string[] {
  const source = tags ?? []
  return [...new Set(source.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20)
}

const STARTER_PROMPTS: CreatePromptInput[] = [
  {
    title: 'Weekly Status Summary',
    category: 'Work',
    tags: ['summary', 'status', 'work'],
    useCase: 'Turn long team updates into concise weekly status notes.',
    aiTarget: 'ChatGPT',
    content: [
      'You are my staff-level project assistant.',
      '',
      'Summarize the notes below into:',
      '1. Wins this week',
      '2. Risks and blockers',
      '3. Next actions with owner and due date',
      '',
      'Keep the tone neutral and factual.',
      '',
      'Notes:',
      '"""',
      '[paste notes here]',
      '"""'
    ].join('\n')
  },
  {
    title: 'Feature Build Prompt',
    category: 'Engineering',
    tags: ['feature', 'implementation', 'coding'],
    useCase: 'Generate an implementation plan and first code draft for a feature.',
    aiTarget: 'ChatGPT',
    content: [
      'Act as a senior software engineer.',
      '',
      'Build this feature from the requirements:',
      '- Explain architecture decisions first',
      '- Produce implementation steps',
      '- Write code with comments only where needed',
      '- Include test cases',
      '',
      'Requirements:',
      '"""',
      '[paste requirements]',
      '"""'
    ].join('\n')
  }
]

function toPromptDTO(row: PromptRow): PromptDTO {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags_csv ? row.tags_csv.split('||') : [],
    favorite: row.favorite === 1,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
    useCount: row.use_count,
    displayOrder: row.display_order ?? 0,
    useCase: row.use_case ?? undefined,
    aiTarget: row.ai_target ?? undefined,
    refinedVersion: row.refined_version ?? undefined,
    validatedAt: row.validated_at ?? undefined,
    validationProvider: row.validation_provider ?? undefined,
    validationModel: row.validation_model ?? undefined,
    validationNotes: row.validation_notes ?? undefined
  }
}

function toPromptVersionDTO(row: PromptVersionRow): PromptVersionDTO {
  return {
    id: row.id,
    promptId: row.prompt_id,
    versionType: row.version_type,
    content: row.content,
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
    metadataJson: row.metadata_json ?? undefined,
    createdAt: row.created_at
  }
}

export class PromptRepo {
  constructor(private readonly db: SqliteDatabase) {}

  ensureStarterPrompts(profileId: string): void {
    const row = this.db
      .prepare<{ profileId: string }, { count: number }>(
        'SELECT COUNT(*) as count FROM prompts WHERE profile_id = @profileId'
      )
      .get({ profileId })

    if ((row?.count ?? 0) > 0) {
      return
    }

    for (const starter of STARTER_PROMPTS) {
      this.createPrompt(profileId, starter)
    }
  }

  private syncTags(profileId: string, promptId: string, tagNames: string[]): void {
    const normalized = normalizeTags(tagNames)
    this.db.prepare('DELETE FROM prompt_tags WHERE prompt_id = ?').run(promptId)

    const upsertTagStmt = this.db.prepare(
      `INSERT INTO tags (id, profile_id, name, color, created_at)
       VALUES (?, ?, ?, '#A87C4B', ?)
       ON CONFLICT(profile_id, name) DO NOTHING`
    )
    const tagLookupStmt = this.db.prepare<{ profileId: string; name: string }, { id: string }>(
      'SELECT id FROM tags WHERE profile_id = @profileId AND name = @name'
    )
    const linkStmt = this.db.prepare(
      'INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)'
    )

    const now = new Date().toISOString()
    for (const tagName of normalized) {
      upsertTagStmt.run(uuidv4(), profileId, tagName, now)
      const row = tagLookupStmt.get({ profileId, name: tagName })
      if (row) {
        linkStmt.run(promptId, row.id)
      }
    }
  }

  private queryBase(): string {
    return `
      SELECT
        p.*,
        GROUP_CONCAT(t.name, '||') AS tags_csv
      FROM prompts p
      LEFT JOIN prompt_tags pt ON pt.prompt_id = p.id
      LEFT JOIN tags t ON t.id = pt.tag_id
    `
  }

  private nextDisplayOrder(profileId: string): number {
    const row = this.db
      .prepare<{ profileId: string }, { nextOrder: number }>(
        'SELECT COALESCE(MIN(display_order), 0) - 1000 as nextOrder FROM prompts WHERE profile_id = @profileId'
      )
      .get({ profileId })

    return row?.nextOrder ?? 0
  }

  listPrompts(profileId: string, filters: PromptListFilters = {}): PromptDTO[] {
    const clauses = ['p.profile_id = @profileId']
    const params: Record<string, string | number> = {
      profileId,
      limit: filters.limit ?? 200,
      offset: filters.offset ?? 0
    }

    if (filters.favorite) {
      clauses.push('p.favorite = 1')
    }
    if (filters.pinned) {
      clauses.push('p.pinned = 1')
    }
    if (filters.category) {
      clauses.push('p.category = @category')
      params.category = filters.category
    }
    if (filters.tag) {
      clauses.push('EXISTS (SELECT 1 FROM prompt_tags xpt JOIN tags xt ON xt.id = xpt.tag_id WHERE xpt.prompt_id = p.id AND xt.name = @tag)')
      params.tag = filters.tag
    }
    if (filters.search && filters.search.trim().length > 0) {
      clauses.push(
        '(LOWER(p.title) LIKE @search OR LOWER(p.content) LIKE @search OR EXISTS (SELECT 1 FROM prompt_tags spt JOIN tags st ON st.id = spt.tag_id WHERE spt.prompt_id = p.id AND LOWER(st.name) LIKE @search))'
      )
      params.search = `%${filters.search.toLowerCase()}%`
    }

    const sql = `${this.queryBase()} WHERE ${clauses.join(' AND ')} GROUP BY p.id ORDER BY COALESCE(p.display_order, 0) ASC, p.updated_at DESC LIMIT @limit OFFSET @offset`

    const rows = this.db.prepare(sql).all(params) as PromptRow[]
    return rows.map(toPromptDTO)
  }

  getPromptById(promptId: string): PromptDTO | null {
    const row = this.db
      .prepare(
        `${this.queryBase()} WHERE p.id = ? GROUP BY p.id LIMIT 1`
      )
      .get(promptId) as PromptRow | undefined

    return row ? toPromptDTO(row) : null
  }

  listPromptsByIds(profileId: string, promptIds: string[]): PromptDTO[] {
    if (promptIds.length === 0) {
      return []
    }

    const placeholders = promptIds.map(() => '?').join(', ')
    const rows = this.db
      .prepare(
        `${this.queryBase()} WHERE p.profile_id = ? AND p.id IN (${placeholders}) GROUP BY p.id ORDER BY COALESCE(p.display_order, 0) ASC, p.updated_at DESC`
      )
      .all(profileId, ...promptIds) as PromptRow[]

    return rows.map(toPromptDTO)
  }

  createPrompt(profileId: string, input: CreatePromptInput): PromptDTO {
    const validationIssues = validatePromptForSave(input)
    if (validationIssues.length > 0) {
      throw new Error(formatPromptValidationIssues(validationIssues))
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO prompts
          (id, profile_id, title, content, category, use_case, ai_target, refined_version, favorite, pinned, created_at, updated_at, last_used_at, use_count, display_order, validated_at, validation_provider, validation_model, validation_notes)
         VALUES
          (@id, @profileId, @title, @content, @category, @useCase, @aiTarget, NULL, @favorite, @pinned, @now, @now, NULL, 0, @displayOrder, NULL, NULL, NULL, NULL)`
      )
      .run({
        id,
        profileId,
        title: input.title.trim(),
        content: input.content,
        category: input.category?.trim() || 'General',
        useCase: input.useCase?.trim() || null,
        aiTarget: input.aiTarget?.trim() || null,
        favorite: input.favorite ? 1 : 0,
        pinned: input.pinned ? 1 : 0,
        displayOrder: this.nextDisplayOrder(profileId),
        now
      })

    this.syncTags(profileId, id, input.tags ?? [])
    this.addVersion(id, {
      versionType: 'original',
      content: input.content
    })

    const created = this.getPromptById(id)
    if (!created) {
      throw new Error('Failed to create prompt')
    }

    return created
  }

  updatePrompt(profileId: string, input: UpdatePromptInput): PromptDTO {
    const existing = this.getPromptById(input.id)
    if (!existing) {
      throw new Error('Prompt not found')
    }
    const validationIssues = validatePromptForSave(input)
    if (validationIssues.length > 0) {
      throw new Error(formatPromptValidationIssues(validationIssues))
    }

    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE prompts SET
          title = @title,
          content = @content,
          category = @category,
          use_case = @useCase,
          ai_target = @aiTarget,
          validated_at = NULL,
          validation_provider = NULL,
          validation_model = NULL,
          validation_notes = NULL,
          favorite = @favorite,
          pinned = @pinned,
          updated_at = @now
         WHERE id = @id AND profile_id = @profileId`
      )
      .run({
        id: input.id,
        profileId,
        title: input.title.trim(),
        content: input.content,
        category: input.category?.trim() || 'General',
        useCase: input.useCase?.trim() || null,
        aiTarget: input.aiTarget?.trim() || null,
        favorite: input.favorite ? 1 : 0,
        pinned: input.pinned ? 1 : 0,
        now
      })

    this.syncTags(profileId, input.id, input.tags ?? [])

    const updated = this.getPromptById(input.id)
    if (!updated) {
      throw new Error('Failed to update prompt')
    }

    return updated
  }

  deletePrompt(profileId: string, promptId: string): void {
    this.db.prepare('DELETE FROM prompts WHERE id = ? AND profile_id = ?').run(promptId, profileId)
  }

  reorderPrompts(profileId: string, promptIds: string[]): PromptDTO[] {
    const uniqueIds = [...new Set(promptIds)]
    if (uniqueIds.length === 0) {
      return this.listPrompts(profileId)
    }

    const placeholders = uniqueIds.map(() => '?').join(', ')
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM prompts WHERE profile_id = ? AND id IN (${placeholders})`
      )
      .get(profileId, ...uniqueIds) as { count: number } | undefined

    if ((row?.count ?? 0) !== uniqueIds.length) {
      throw new Error('Cannot reorder prompts outside the active profile')
    }

    const updateOrder = this.db.prepare(
      'UPDATE prompts SET display_order = @displayOrder WHERE id = @promptId AND profile_id = @profileId'
    )
    const applyOrder = this.db.transaction((ids: string[]) => {
      ids.forEach((promptId, index) => {
        updateOrder.run({
          profileId,
          promptId,
          displayOrder: index * 1000
        })
      })
    })

    applyOrder(uniqueIds)
    return this.listPrompts(profileId)
  }

  toggleFavorite(profileId: string, promptId: string): PromptDTO {
    this.db
      .prepare(
        `UPDATE prompts
         SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END,
             updated_at = @now
         WHERE id = @promptId AND profile_id = @profileId`
      )
      .run({ profileId, promptId, now: new Date().toISOString() })

    const prompt = this.getPromptById(promptId)
    if (!prompt) {
      throw new Error('Prompt not found')
    }

    return prompt
  }

  togglePinned(profileId: string, promptId: string): PromptDTO {
    this.db
      .prepare(
        `UPDATE prompts
         SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END,
             updated_at = @now
         WHERE id = @promptId AND profile_id = @profileId`
      )
      .run({ profileId, promptId, now: new Date().toISOString() })

    const prompt = this.getPromptById(promptId)
    if (!prompt) {
      throw new Error('Prompt not found')
    }

    return prompt
  }

  markPromptUsed(profileId: string, promptId: string): PromptDTO {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE prompts
         SET use_count = use_count + 1,
             last_used_at = ?,
             updated_at = ?
         WHERE id = ? AND profile_id = ?`
      )
      .run(now, now, promptId, profileId)

    const prompt = this.getPromptById(promptId)
    if (!prompt) {
      throw new Error('Prompt not found')
    }

    return prompt
  }

  addVersion(
    promptId: string,
    version: {
      versionType: 'original' | 'refined' | 'manual'
      content: string
      provider?: string
      model?: string
      metadataJson?: string
    }
  ): PromptVersionDTO {
    const id = uuidv4()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO prompt_versions
          (id, prompt_id, version_type, content, provider, model, metadata_json, created_at)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        promptId,
        version.versionType,
        version.content,
        version.provider ?? null,
        version.model ?? null,
        version.metadataJson ?? null,
        now
      )

    const row = this.db
      .prepare<string, PromptVersionRow>('SELECT * FROM prompt_versions WHERE id = ?')
      .get(id)

    if (!row) {
      throw new Error('Failed to add version')
    }

    return toPromptVersionDTO(row)
  }

  listVersions(promptId: string): PromptVersionDTO[] {
    const rows = this.db
      .prepare<string, PromptVersionRow>(
        'SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY created_at DESC'
      )
      .all(promptId)

    return rows.map(toPromptVersionDTO)
  }

  applyRefinedContent(
    profileId: string,
    promptId: string,
    refinedContent: string,
    mode: 'replace' | 'variant',
    meta: { provider: string; model: string; notes?: string }
  ): PromptDTO {
    const prompt = this.getPromptById(promptId)
    if (!prompt || prompt.profileId !== profileId) {
      throw new Error('Prompt not found')
    }

    this.addVersion(promptId, {
      versionType: 'refined',
      content: refinedContent,
      provider: meta.provider,
      model: meta.model,
      metadataJson: meta.notes ? JSON.stringify({ notes: meta.notes }) : undefined
    })

    if (mode === 'replace') {
      const now = new Date().toISOString()
      this.db
        .prepare(
        `UPDATE prompts
           SET content = ?, refined_version = ?, updated_at = ?, validated_at = NULL, validation_provider = NULL, validation_model = NULL, validation_notes = NULL
           WHERE id = ? AND profile_id = ?`
        )
        .run(refinedContent, refinedContent, now, promptId, profileId)
    }

    const updated = this.getPromptById(promptId)
    if (!updated) {
      throw new Error('Prompt not found after refinement')
    }

    return updated
  }

  listRecent(profileId: string, limit = 12): PromptDTO[] {
    const rows = this.db
      .prepare(
        `${this.queryBase()} WHERE p.profile_id = ? GROUP BY p.id ORDER BY COALESCE(p.last_used_at, p.updated_at) DESC LIMIT ?`
      )
      .all(profileId, limit) as PromptRow[]
    return rows.map(toPromptDTO)
  }

  listTags(profileId: string): Array<{ name: string; count: number }> {
    return this.db
      .prepare<
        { profileId: string },
        {
          name: string
          count: number
        }
      >(
        `SELECT t.name as name, COUNT(pt.prompt_id) as count
         FROM tags t
         LEFT JOIN prompt_tags pt ON pt.tag_id = t.id
         WHERE t.profile_id = @profileId
         GROUP BY t.id
         ORDER BY count DESC, t.name ASC`
      )
      .all({ profileId })
  }

  listCategories(profileId: string): Array<{ name: string; count: number }> {
    return this.db
      .prepare<
        { profileId: string },
        {
          name: string
          count: number
        }
      >(
        `SELECT p.category as name, COUNT(p.id) as count
         FROM prompts p
         WHERE p.profile_id = @profileId
           AND TRIM(COALESCE(p.category, '')) <> ''
         GROUP BY p.category
         ORDER BY count DESC, p.category ASC`
      )
      .all({ profileId })
  }

  findDuplicate(profileId: string, title: string, content: string): PromptDTO | null {
    const row = this.db
      .prepare(
        `${this.queryBase()}
         WHERE p.profile_id = ? AND p.title = ? AND p.content = ?
         GROUP BY p.id
         LIMIT 1`
      )
      .get(profileId, title, content) as PromptRow | undefined

    return row ? toPromptDTO(row) : null
  }

  setPromptValidation(
    profileId: string,
    promptId: string,
    validation: PromptValidationResult
  ): PromptDTO {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE prompts
         SET validated_at = @now,
             validation_provider = @provider,
             validation_model = @model,
             validation_notes = @notes,
             updated_at = @now
         WHERE id = @promptId AND profile_id = @profileId`
      )
      .run({
        now,
        provider: validation.providerId,
        model: validation.model,
        notes: `${validation.verdict}: ${validation.notes}`,
        promptId,
        profileId
      })

    const updated = this.getPromptById(promptId)
    if (!updated) {
      throw new Error('Prompt not found')
    }
    return updated
  }
}
