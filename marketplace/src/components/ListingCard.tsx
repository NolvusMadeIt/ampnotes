import Link from 'next/link'
import type { ListingItem } from '@/lib/types'

function formatPrice(item: ListingItem): string {
  if (item.tier === 'free') {
    return 'Free'
  }
  if (!item.priceCents) {
    return 'Paid'
  }
  return `$${(item.priceCents / 100).toFixed(2)}`
}

interface ListingCardProps {
  item: ListingItem
}

export function ListingCard({ item }: ListingCardProps) {
  return (
    <article className="listing-card">
      <div className={`listing-eyebrow listing-eyebrow-${item.kind}`}>
        <span>{item.kind === 'plugin' ? 'Plugin' : 'Theme'}</span>
        <span className={`pill ${item.tier === 'paid' ? 'pill-paid' : 'pill-free'}`}>{formatPrice(item)}</span>
      </div>

      <h2>{item.title}</h2>
      <p className="listing-meta">
        v{item.version} · {item.compatibility} · Updated {item.updatedAt}
      </p>
      <p className="listing-description">{item.shortDescription}</p>

      <div className="tag-row">
        {item.tags.map((tag) => (
          <span key={tag} className="tag">
            #{tag}
          </span>
        ))}
      </div>

      <div className="listing-footer">
        <div className="stats">
          <span>{item.downloads.toLocaleString()} installs</span>
          <span>{item.rating.toFixed(1)} rating</span>
        </div>
        <Link className="button button-primary" href={`/listing/${item.slug}`}>
          View Details
        </Link>
      </div>
    </article>
  )
}
