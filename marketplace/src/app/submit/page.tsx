import { redirect } from 'next/navigation'
import { createSubmission } from '@/lib/submissions'
import type { ListingKind } from '@/lib/types'

interface SubmitParams {
  ok?: string
  error?: string
}

async function submitAction(formData: FormData) {
  'use server'

  const kind = String(formData.get('kind') ?? 'plugin') as ListingKind
  const title = String(formData.get('title') ?? '')
  const shortDescription = String(formData.get('shortDescription') ?? '')
  const author = String(formData.get('author') ?? '')
  const version = String(formData.get('version') ?? '')
  const compatibility = String(formData.get('compatibility') ?? '')
  const homepage = String(formData.get('homepage') ?? '')
  const tagsRaw = String(formData.get('tags') ?? '')
  const manifestJson = String(formData.get('manifestJson') ?? '')
  const tier = String(formData.get('tier') ?? 'free')

  if (tier !== 'free') {
    redirect('/submit?error=Paid+submissions+are+not+accepted+in+this+repo')
  }

  try {
    await createSubmission({
      kind: kind === 'theme' ? 'theme' : 'plugin',
      title,
      shortDescription,
      author,
      version,
      compatibility,
      homepage,
      tags: tagsRaw.split(','),
      manifestJson
    })
    redirect('/submit?ok=1')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submission failed'
    redirect(`/submit?error=${encodeURIComponent(message)}`)
  }
}

export default async function SubmitPage({
  searchParams
}: Readonly<{
  searchParams: Promise<SubmitParams>
}>) {
  const params = await searchParams
  return (
    <main className="stack">
      <section className="panel submit-head">
        <p className="eyebrow">Creator Submission</p>
        <h1>Submit a free plugin or theme</h1>
        <p>
          Free submissions are reviewed in the admin panel. Paid products are handled outside this repo (for example
          Gumroad).
        </p>
      </section>

      <section className="panel submit-panel">
        <form action={submitAction} className="submit-form">
          <input type="hidden" name="tier" value="free" />

          <label>
            Asset type
            <select name="kind" defaultValue="plugin">
              <option value="plugin">Plugin</option>
              <option value="theme">Theme</option>
            </select>
          </label>

          <label>
            Title
            <input name="title" placeholder="Word Count Pro" required />
          </label>

          <label>
            Author
            <input name="author" placeholder="Your name or studio" required />
          </label>

          <label>
            Version
            <input name="version" placeholder="1.0.0" required />
          </label>

          <label>
            Compatibility
            <input name="compatibility" placeholder="AMP >= 0.1.0" required />
          </label>

          <label className="span-2">
            Short description
            <textarea
              name="shortDescription"
              rows={3}
              placeholder="What this plugin or theme does and why users should install it."
              required
            />
          </label>

          <label className="span-2">
            Tags (comma separated)
            <input name="tags" placeholder="writing, productivity, editor" />
          </label>

          <label className="span-2">
            Homepage URL (optional)
            <input name="homepage" placeholder="https://example.com/your-project" />
          </label>

          <label className="span-2">
            Manifest JSON
            <textarea
              name="manifestJson"
              rows={12}
              placeholder='{"id":"plugin.your-id","name":"Your Plugin","version":"1.0.0"}'
              required
            />
          </label>

          <button className="button button-primary button-pill span-2" type="submit">
            Submit for review
          </button>
        </form>

        {params.ok ? <p className="success-note">Submission received. Review it in /admin.</p> : null}
        {params.error ? <p className="error-note">{decodeURIComponent(params.error)}</p> : null}
      </section>
    </main>
  )
}
