import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDb, getDb } from '@main/db/client'
import { ProfileRepo, PromptRepo } from '@main/db/repos'

let dbPath = ''

beforeEach(() => {
  dbPath = join(tmpdir(), `ampnotes-test-${Date.now()}-${Math.random()}.sqlite3`)
  process.env.AMP_DB_PATH = dbPath
})

afterEach(() => {
  closeDb()
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (existsSync(file)) {
      try {
        rmSync(file, { force: true })
      } catch {
        // ignore windows file lock races in tests
      }
    }
  }
  delete process.env.AMP_DB_PATH
})

describe('PromptRepo', () => {
  it('creates profiles and prompts, then supports search and tag listing', () => {
    const db = getDb()
    const profileRepo = new ProfileRepo(db)
    const promptRepo = new PromptRepo(db)

    const profile = profileRepo.createProfile('Nora')
    profileRepo.signIn(profile.id)

    promptRepo.createPrompt(profile.id, {
      title: 'Debug flaky test',
      content: 'Find why this test fails intermittently.',
      category: 'Engineering',
      tags: ['testing', 'debug']
    })

    promptRepo.createPrompt(profile.id, {
      title: 'PR summary',
      content: 'Summarize this pull request in business terms.',
      category: 'Review',
      tags: ['communication']
    })

    const searchResults = promptRepo.listPrompts(profile.id, { search: 'flaky' })
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0]?.title).toBe('Debug flaky test')

    const tags = promptRepo.listTags(profile.id)
    expect(tags.some((tag) => tag.name === 'testing')).toBe(true)
  })

  it('tracks prompt usage when copied', () => {
    const db = getDb()
    const profileRepo = new ProfileRepo(db)
    const promptRepo = new PromptRepo(db)

    const profile = profileRepo.createProfile('Ari')
    const prompt = promptRepo.createPrompt(profile.id, {
      title: 'Starter',
      content: 'Hello from AMP',
      tags: []
    })

    const updated = promptRepo.markPromptUsed(profile.id, prompt.id)
    expect(updated.useCount).toBe(1)
    expect(updated.lastUsedAt).not.toBeNull()
  })

  it('persists custom prompt order', () => {
    const db = getDb()
    const profileRepo = new ProfileRepo(db)
    const promptRepo = new PromptRepo(db)

    const profile = profileRepo.createProfile('Mira')
    const first = promptRepo.createPrompt(profile.id, {
      title: 'First Prompt',
      content: 'First prompt content',
      tags: []
    })
    const second = promptRepo.createPrompt(profile.id, {
      title: 'Second Prompt',
      content: 'Second prompt content',
      tags: []
    })
    const third = promptRepo.createPrompt(profile.id, {
      title: 'Third Prompt',
      content: 'Third prompt content',
      tags: []
    })

    promptRepo.reorderPrompts(profile.id, [second.id, third.id, first.id])

    expect(promptRepo.listPrompts(profile.id).map((prompt) => prompt.id)).toEqual([
      second.id,
      third.id,
      first.id
    ])
  })
})
