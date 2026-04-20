import { NextResponse } from 'next/server'
import { getListingBySlug } from '@/lib/catalog'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params
  const listing = await getListingBySlug(slug)

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  return NextResponse.json({ listing })
}
