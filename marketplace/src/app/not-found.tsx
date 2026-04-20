import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="stack">
      <section className="panel">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>This route is not available.</p>
        <Link href="/" className="button button-primary button-pill">
          Back to marketplace
        </Link>
      </section>
    </main>
  )
}
