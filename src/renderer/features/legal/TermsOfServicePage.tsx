const LAST_UPDATED = 'April 17, 2026'

export function TermsOfServicePage() {
  return (
    <article className="rounded-xl border border-line/20 bg-surface p-5 sm:p-6">
      <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">Terms of Service</p>
      <h1 className="editorial-heading mt-2 text-3xl font-semibold">AMP Terms</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">1. Product Definition</h2>
        <p className="text-sm text-muted">
          AMP means <strong>All My Prompts</strong>, a prompt-writing and sharing app created by
          <strong> NolvusMadeIt</strong>.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">2. Acceptable Use</h2>
        <p className="text-sm text-muted">
          You agree to use AMP responsibly and lawfully. You must not use the app to publish or distribute harmful,
          abusive, fraudulent, or illegal content.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">3. Shared Content</h2>
        <p className="text-sm text-muted">
          You are responsible for prompts, templates, themes, and plugin manifests you create or share. Validate
          content before publishing and avoid sharing secrets, private credentials, or sensitive personal data.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">4. Plugins and Themes</h2>
        <p className="text-sm text-muted">
          Community plugins/themes are user-generated and should be treated as untrusted input until reviewed. AMP may
          reject malformed manifests and can disable unsafe extensions.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">5. Marketplace</h2>
        <p className="text-sm text-muted">
          The AMP Marketplace link is a placeholder until the community website is released. Marketplace submissions,
          downloads, and publishing rules may receive additional terms before launch.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">6. Warranty and Liability</h2>
        <p className="text-sm text-muted">
          AMP is provided "as is" without guarantees of uninterrupted service, security, or fitness for a specific
          purpose. Use at your own discretion.
        </p>
      </section>
    </article>
  )
}
