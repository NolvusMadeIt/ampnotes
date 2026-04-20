import { NextResponse } from 'next/server'
import { getFilteredListings } from '@/lib/catalog'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const kind = (searchParams.get('kind') as 'all' | 'plugin' | 'theme' | null) ?? 'all'
  const tier = (searchParams.get('tier') as 'all' | 'free' | 'paid' | null) ?? 'all'
  const sort = (searchParams.get('sort') as 'featured' | 'newest' | 'top' | null) ?? 'featured'

  const items = await getFilteredListings({ q, kind, tier, sort })
  return NextResponse.json({ items, count: items.length })
}
