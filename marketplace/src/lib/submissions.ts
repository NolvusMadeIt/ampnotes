import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ListingKind, SubmissionItem, SubmissionStatus } from './types'

interface SubmissionInput {
  kind: ListingKind
  title: string
  shortDescription: string
  author: string
  version: string
  compatibility: string
  tags: string[]
  homepage?: string
  manifestJson: string
}

const DATA_DIR = join(process.cwd(), 'data')
const SUBMISSIONS_FILE = join(DATA_DIR, 'submissions.json')

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    await readFile(SUBMISSIONS_FILE, 'utf8')
  } catch {
    await writeFile(SUBMISSIONS_FILE, '[]', 'utf8')
  }
}

export async function readSubmissions(): Promise<SubmissionItem[]> {
  await ensureStore()
  const raw = await readFile(SUBMISSIONS_FILE, 'utf8')
  const parsed = JSON.parse(raw) as SubmissionItem[]
  return Array.isArray(parsed) ? parsed : []
}

function normalizeTags(tags: string[]): string[] {
  const values = tags.map((item) => item.trim().toLowerCase()).filter(Boolean)
  return Array.from(new Set(values)).slice(0, 8)
}

function parseManifest(kind: ListingKind, manifestJson: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(manifestJson)
  } catch {
    throw new Error('Manifest JSON is invalid.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Manifest JSON must be an object.')
  }

  const manifest = parsed as Record<string, unknown>
  const id = String(manifest.id ?? '').trim()
  if (!id) {
    throw new Error('Manifest must include an id.')
  }

  if (kind === 'plugin' && !id.startsWith('plugin.')) {
    throw new Error('Plugin manifest id must start with "plugin."')
  }
  if (kind === 'theme' && !id.startsWith('theme.')) {
    throw new Error('Theme manifest id must start with "theme."')
  }

  return manifest
}

export async function createSubmission(input: SubmissionInput): Promise<SubmissionItem> {
  if (!input.title.trim()) {
    throw new Error('Title is required.')
  }
  if (!input.shortDescription.trim()) {
    throw new Error('Short description is required.')
  }
  if (!input.author.trim()) {
    throw new Error('Author is required.')
  }
  if (!input.version.trim()) {
    throw new Error('Version is required.')
  }
  if (!input.compatibility.trim()) {
    throw new Error('Compatibility is required.')
  }

  const manifest = parseManifest(input.kind, input.manifestJson)
  const normalizedTags = normalizeTags(input.tags)

  const record: SubmissionItem = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    kind: input.kind,
    tier: 'free',
    title: input.title.trim(),
    shortDescription: input.shortDescription.trim(),
    author: input.author.trim(),
    version: input.version.trim(),
    compatibility: input.compatibility.trim(),
    tags: normalizedTags,
    homepage: input.homepage?.trim() || undefined,
    manifest
  }

  const existing = await readSubmissions()
  existing.unshift(record)
  await writeFile(SUBMISSIONS_FILE, JSON.stringify(existing, null, 2), 'utf8')
  return record
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<SubmissionItem> {
  const existing = await readSubmissions()
  const index = existing.findIndex((item) => item.id === id)
  if (index < 0) {
    throw new Error('Submission not found')
  }
  const updated = {
    ...existing[index],
    status
  }
  existing[index] = updated
  await writeFile(SUBMISSIONS_FILE, JSON.stringify(existing, null, 2), 'utf8')
  return updated
}
