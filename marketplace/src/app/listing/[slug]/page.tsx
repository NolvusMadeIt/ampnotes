import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getListingBySlug } from '@/lib/catalog'
import { APP_RELEASE_URL, buildAmpInstallLink } from '@/lib/install'

interface PageProps {
  params: Promise<{ slug: string }>
}

function priceLabel(priceCents?: number): string {
  if (!priceCents) {
    return 'Paid'
  }
  return `$${(priceCents / 100).toFixed(2)}`
}

export default async function ListingDetailPage({ params }: Readonly<PageProps>) {
  const { slug } = await params
  const foundListing = await getListingBySlug(slug)

  if (!foundListing) {
    notFound()
  }

  const listing = foundListing
  const manifestUrl = `/api/manifests/${listing.kind}/${encodeURIComponent(listing.manifestId)}`
  const headerStore = await headers()
  const host = headerStore.get('host') ?? 'localhost:4100'
  const forwardedProto = headerStore.get('x-forwarded-proto')
  const protocol = forwardedProto ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const baseUrl = `${protocol}://${host}`
  const appInstallUrl = buildAmpInstallLink(listing, baseUrl)

  return (
    <main className="stack">
      <section className="panel detail-head">
        <div>
          <p className="eyebrow">
            {listing.kind === 'plugin' ? 'Plugin' : 'Theme'} · {listing.tier === 'free' ? 'Free' : priceLabel(listing.priceCents)}
          </p>
          <h1>{listing.title}</h1>
          <p className="listing-meta">
            v{listing.version} · {listing.compatibility} · Updated {listing.updatedAt}
          </p>
        </div>
        <div className="detail-actions">
          {listing.tier === 'paid' ? (
            <a
              className="button button-primary button-pill"
              href={listing.gumroadUrl ?? 'https://nolvusmadeit.gumroad.com'}
              target="_blank"
              rel="noreferrer"
            >
              Buy on Gumroad
            </a>
          ) : (
            <a className="button button-primary button-pill" href={appInstallUrl}>
              Install in AMP
            </a>
          )}
          <a className="button button-secondary button-pill" href={APP_RELEASE_URL} target="_blank" rel="noreferrer">
            Download AMP App
          </a>
          <Link className="button button-secondary button-pill" href="/">
            Back to catalog
          </Link>
        </div>
      </section>

      <section className="panel detail-body">
        <article>
          <h2>Description</h2>
          <p>{listing.fullDescription}</p>

          <h3>Tags</h3>
          <div className="tag-row">
            {listing.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </article>

        <aside>
          <h3>Install In AMP</h3>
          <ol>
            <li>Click Install in AMP above.</li>
            <li>If AMP is installed, it opens and installs automatically.</li>
            <li>If AMP is not installed, install it from the release link first.</li>
          </ol>
          <code>{appInstallUrl}</code>
          <p className="install-tip">
            Fallback manifest URL (manual import):
            <br />
            <code>{manifestUrl}</code>
          </p>

          <h3 style={{ marginTop: '1rem' }}>Stats</h3>
          <ul>
            <li>{listing.downloads.toLocaleString()} installs</li>
            <li>{listing.rating.toFixed(1)} average rating</li>
            <li>Author: {listing.author}</li>
          </ul>
        </aside>
      </section>
    </main>
  )
}
