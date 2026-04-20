export type ListingKind = 'plugin' | 'theme'
export type ListingTier = 'free' | 'paid'

export interface ListingItem {
  id: string
  slug: string
  kind: ListingKind
  tier: ListingTier
  title: string
  shortDescription: string
  fullDescription: string
  tags: string[]
  version: string
  compatibility: string
  updatedAt: string
  author: string
  manifestId: string
  gumroadUrl?: string
  priceCents?: number
  featured?: boolean
  downloads: number
  rating: number
}

export interface ListingFilters {
  kind?: 'all' | ListingKind
  tier?: 'all' | ListingTier
  q?: string
  sort?: 'featured' | 'newest' | 'top'
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface SubmissionItem {
  id: string
  createdAt: string
  status: SubmissionStatus
  kind: ListingKind
  tier: 'free'
  title: string
  shortDescription: string
  author: string
  version: string
  compatibility: string
  tags: string[]
  homepage?: string
  manifest: Record<string, unknown>
}
