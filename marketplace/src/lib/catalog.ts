import { LISTINGS } from './listings'
import type { ListingFilters, ListingItem } from './types'
import { readSubmissions } from './submissions'

function bySearch(listing: ListingItem, q: string): boolean {
  const haystack = `${listing.title}\n${listing.shortDescription}\n${listing.fullDescription}\n${listing.tags.join(' ')}`.toLowerCase()
  return haystack.includes(q.toLowerCase())
}

function sortListings(items: ListingItem[], sort: ListingFilters['sort']): ListingItem[] {
  if (sort === 'newest') {
    return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }
  if (sort === 'top') {
    return [...items].sort((a, b) => b.rating - a.rating || b.downloads - a.downloads)
  }
  return [...items].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.downloads - a.downloads)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function getDynamicListings(): Promise<ListingItem[]> {
  const submissions = await readSubmissions()
  const approvedListings: ListingItem[] = submissions
    .filter((item) => item.status === 'approved')
    .map((item) => {
      const manifestId = String(item.manifest.id ?? item.id)
      return {
        id: item.id,
        slug: `${slugify(item.title)}-${item.id.slice(0, 8)}`,
        kind: item.kind,
        tier: 'free',
        title: item.title,
        shortDescription: item.shortDescription,
        fullDescription: item.shortDescription,
        tags: item.tags,
        version: item.version,
        compatibility: item.compatibility,
        updatedAt: item.createdAt.slice(0, 10),
        author: item.author,
        manifestId,
        downloads: 0,
        rating: 5
      }
    })

  return [...approvedListings, ...LISTINGS]
}

export async function getFilteredListings(filters: ListingFilters = {}): Promise<ListingItem[]> {
  const kind = filters.kind ?? 'all'
  const tier = filters.tier ?? 'all'
  const q = (filters.q ?? '').trim()
  const sort = filters.sort ?? 'featured'
  const listings = await getDynamicListings()

  const filtered = listings.filter((listing) => {
    if (kind !== 'all' && listing.kind !== kind) {
      return false
    }
    if (tier !== 'all' && listing.tier !== tier) {
      return false
    }
    if (q && !bySearch(listing, q)) {
      return false
    }
    return true
  })

  return sortListings(filtered, sort)
}

export async function getListingBySlug(slug: string): Promise<ListingItem | null> {
  const listings = await getDynamicListings()
  return listings.find((item) => item.slug === slug) ?? null
}
