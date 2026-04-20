import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { SharePackageV1 } from '@shared/types'

const sharePackageSchema = z.object({
  schemaVersion: z.literal('ampnotes.share.v1'),
  createdAt: z.string(),
  source: z.object({
    app: z.literal('ampnotes'),
    version: z.string()
  }),
  credits: z
    .object({
      name: z.string().min(1).max(80),
      socials: z
        .object({
          github: z.string().url().optional(),
          x: z.string().url().optional(),
          website: z.string().url().optional()
        })
        .partial()
        .optional()
    })
    .optional(),
  prompt: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    category: z.string().min(1),
    tags: z.array(z.string()).max(20),
    useCase: z.string().optional(),
    aiTarget: z.string().optional(),
    refinedVersion: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  }),
  checksum: z.string().length(64)
})

function calcChecksum(payload: Omit<SharePackageV1, 'checksum'>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function validateSharePackage(payload: unknown): SharePackageV1 {
  const parsed = sharePackageSchema.parse(payload)
  const { checksum, ...rest } = parsed
  const computed = calcChecksum(rest)

  if (checksum !== computed) {
    throw new Error('Invalid share package checksum')
  }

  return parsed
}

export function getSharePayloadHash(payload: SharePackageV1): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

const DANGEROUS_MARKERS = [
  '<script',
  'javascript:',
  'vbscript:',
  'data:text/html',
  'powershell -enc',
  'invoke-expression',
  'rundll32',
  'wmic process call create',
  'mshta '
]

export function scanPayloadForThreats(payload: string): { ok: boolean; reason?: string } {
  const lower = payload.toLowerCase()
  const marker = DANGEROUS_MARKERS.find((item) => lower.includes(item))
  if (marker) {
    return {
      ok: false,
      reason: `Security scan blocked import/export content containing suspicious marker: "${marker}".`
    }
  }
  return { ok: true }
}
