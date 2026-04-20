import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LISTINGS } from '@/lib/listings'
import { readSubmissions, updateSubmissionStatus } from '@/lib/submissions'

const ADMIN_COOKIE = 'amp_market_admin'

async function loginAction(formData: FormData) {
  'use server'

  const submittedKey = String(formData.get('key') ?? '')
  const adminKey = process.env.MARKETPLACE_ADMIN_KEY || 'change-this-now'

  if (!submittedKey || submittedKey !== adminKey) {
    redirect('/admin?error=1')
  }

  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'
  cookieStore.set(ADMIN_COOKIE, submittedKey, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8
  })

  redirect('/admin')
}

async function logoutAction() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  redirect('/admin')
}

async function updateSubmissionAction(formData: FormData) {
  'use server'
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || (status !== 'approved' && status !== 'rejected' && status !== 'pending')) {
    redirect('/admin')
  }
  await updateSubmissionStatus(id, status)
  redirect('/admin')
}

export default async function AdminPage({
  searchParams
}: Readonly<{
  searchParams: Promise<{ error?: string }>
}>) {
  const params = await searchParams
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_COOKIE)?.value
  const adminKey = process.env.MARKETPLACE_ADMIN_KEY || 'change-this-now'
  const loggedIn = Boolean(session && session === adminKey)

  if (!loggedIn) {
    const isDefaultAdminKey = adminKey === 'change-this-now'
    return (
      <main className="stack">
        <section className="panel admin-login">
          <div className="admin-login-copy">
            <p className="eyebrow">Private Control Panel</p>
            <h1>Admin Access</h1>
            <p>Enter your marketplace admin key. This route is intentionally not linked in public navigation.</p>
            {isDefaultAdminKey ? (
              <p className="warn-note">
                You are using the default admin key. Set <code>MARKETPLACE_ADMIN_KEY</code> in{' '}
                <code>marketplace/.env.local</code> before deployment.
              </p>
            ) : null}
          </div>
          <form action={loginAction} className="admin-form">
            <label>
              Admin key
              <input name="key" type="password" autoComplete="current-password" placeholder="Enter key..." />
            </label>
            <button className="button button-primary button-pill" type="submit">
              Enter control panel
            </button>
            {params.error ? <p className="error-note">Invalid key. Try again.</p> : null}
          </form>
          <Link href="/" className="button button-secondary button-pill">
            Back to marketplace
          </Link>
        </section>
      </main>
    )
  }

  const pluginCount = LISTINGS.filter((item) => item.kind === 'plugin').length
  const themeCount = LISTINGS.filter((item) => item.kind === 'theme').length
  const paidCount = LISTINGS.filter((item) => item.tier === 'paid').length
  const freeCount = LISTINGS.filter((item) => item.tier === 'free').length
  const submissions = await readSubmissions()
  const pendingSubmissions = submissions.filter((item) => item.status === 'pending')

  return (
    <main className="stack">
      <section className="panel admin-head">
        <div>
          <p className="eyebrow">AMP Marketplace</p>
          <h1>Admin Control Panel</h1>
          <p>Manage catalog quality, check manifests, and monitor free/paid distribution.</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="button button-secondary button-pill">
            Sign out
          </button>
        </form>
      </section>

      <section className="stats-grid">
        <article className="panel">
          <h2>{LISTINGS.length}</h2>
          <p>Total listings</p>
        </article>
        <article className="panel">
          <h2>{pluginCount}</h2>
          <p>Plugins</p>
        </article>
        <article className="panel">
          <h2>{themeCount}</h2>
          <p>Themes</p>
        </article>
        <article className="panel">
          <h2>
            {freeCount} / {paidCount}
          </h2>
          <p>Free / Paid</p>
        </article>
        <article className="panel">
          <h2>{pendingSubmissions.length}</h2>
          <p>Pending submissions</p>
        </article>
      </section>

      <section className="panel admin-table-wrap">
        <h2>Catalog Items</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Tier</th>
              <th>Manifest URL</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {LISTINGS.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.kind}</td>
                <td>{item.tier}</td>
                <td>
                  <code>{`/api/manifests/${item.kind}/${encodeURIComponent(item.manifestId)}`}</code>
                </td>
                <td>{item.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel admin-table-wrap">
        <h2>Creator Submissions (Free Only)</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Title</th>
              <th>Type</th>
              <th>Author</th>
              <th>Status</th>
              <th>Version</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={7}>No submissions yet.</td>
              </tr>
            ) : (
              submissions.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.title}</td>
                  <td>{item.kind}</td>
                  <td>{item.author}</td>
                  <td>{item.status}</td>
                  <td>{item.version}</td>
                  <td>
                    <div className="admin-actions">
                      <form action={updateSubmissionAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value="approved" />
                        <button type="submit" className="button button-mini button-primary">
                          Approve
                        </button>
                      </form>
                      <form action={updateSubmissionAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <button type="submit" className="button button-mini button-danger">
                          Reject
                        </button>
                      </form>
                      {item.status !== 'pending' ? (
                        <form action={updateSubmissionAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="status" value="pending" />
                          <button type="submit" className="button button-mini button-secondary">
                            Reset
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
