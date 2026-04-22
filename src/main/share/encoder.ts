import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import type { ExportCredits, PromptDTO, SharePackageV1 } from '@shared/types'

function checksum(payload: Omit<SharePackageV1, 'checksum'>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function createSharePackage(prompt: PromptDTO, credits?: ExportCredits): SharePackageV1 {
  const base = {
    schemaVersion: 'ampnotes.share.v1' as const,
    createdAt: new Date().toISOString(),
    source: {
      app: 'ampnotes' as const,
      version: '0.1.3'
    },
    credits,
    prompt: {
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      useCase: prompt.useCase,
      aiTarget: prompt.aiTarget,
      refinedVersion: prompt.refinedVersion,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt
    }
  }

  return {
    ...base,
    checksum: checksum(base)
  }
}

export function encodeSharePackage(pkg: SharePackageV1): string {
  const json = JSON.stringify(pkg)
  return deflateSync(Buffer.from(json, 'utf8')).toString('base64url')
}
