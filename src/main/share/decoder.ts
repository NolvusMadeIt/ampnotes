import { inflateSync } from 'node:zlib'
import type { SharePackageV1 } from '@shared/types'

export function decodeSharePackage(encoded: string): SharePackageV1 {
  const buffer = Buffer.from(encoded, 'base64url')
  const json = inflateSync(buffer).toString('utf8')
  return JSON.parse(json) as SharePackageV1
}
