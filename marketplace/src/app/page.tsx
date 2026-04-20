import Link from 'next/link'
import { CatalogFilters } from '@/components/CatalogFilters'
import { ListingCard } from '@/components/ListingCard'
import { getFilteredListings } from '@/lib/catalog'
import { APP_RELEASE_URL } from '@/lib/install'
import type { ListingFilters } from '@/lib/types'

interface SearchParams {
  q?: string
  kind?: 'all' | 'plugin' | 'theme'
  tier?: 'all' | 'free' | 'paid'
  sort?: 'featured' | 'newest' | 'top'
}

export default async function MarketplacePage({
  searchParams
}: Readonly<{
  searchParams: Promise<SearchParams>
}>) {
  const params = await searchParams

  const filters: ListingFilters = {
    q: params.q ?? '',
    kind: params.kind ?? 'all',
    tier: params.tier ?? 'all',
    sort: params.sort ?? 'featured'
  }

  const listings = await getFilteredListings(filters)

  return (
    <main className="stack">
      <section className="hero hero-single">
        <div className="hero-copy hero-copy-clean">
          <p className="eyebrow">AMP Marketplace</p>
          <h1>Discover premium and free assets for AMP.</h1>
          <p>
            A curated marketplace for AMP themes and plugins. Every listing includes compatibility data and manifest
            import support.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-pill" href="/?tier=free">
              Explore free assets
            </Link>
            <a
              className="button button-secondary button-pill"
              href="https://nolvusmadeit.gumroad.com"
              target="_blank"
              rel="noreferrer"
            >
              Visit Gumroad profile
            </a>
            <a className="button button-secondary button-pill" href={APP_RELEASE_URL} target="_blank" rel="noreferrer">
              Download AMP App
            </a>
          </div>
          <div className="hero-chips">
            <span className="hero-chip">Manifest URL install</span>
            <span className="hero-chip">Free + Paid</span>
            <span className="hero-chip">Desktop-ready assets</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <CatalogFilters value={filters} />
      </section>

      <section className="catalog-grid">
        {listings.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </section>
    </main>
  )
}
