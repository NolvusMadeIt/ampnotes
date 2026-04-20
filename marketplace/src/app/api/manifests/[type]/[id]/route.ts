import { NextResponse } from 'next/server'
import { getManifest } from '@/lib/manifests'
import type { ListingKind } from '@/lib/types'

interface RouteParams {
  params: Promise<{ type: string; id: string }>
}

function parseKind(value: string): ListingKind | null {
  if (value === 'plugin') {
    return 'plugin'
  }
  if (value === 'theme') {
    return 'theme'
  }
  return null
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { type, id } = await params
  const kind = parseKind(type)

  if (!kind) {
    return NextResponse.json({ error: 'Invalid manifest type' }, { status: 400 })
  }

  const manifest = getManifest(kind, decodeURIComponent(id))

  if (!manifest) {
    return NextResponse.json({ error: 'Manifest not found' }, { status: 404 })
  }

  return NextResponse.json(manifest, {
    headers: {
      'cache-control': 'public, max-age=300'
    }
  })
}
