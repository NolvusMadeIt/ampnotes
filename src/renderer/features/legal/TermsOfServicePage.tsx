const LAST_UPDATED = 'April 17, 2026'

export function TermsOfServicePage() {
  return (
    <article className="space-y-6 rounded-xl border border-line/20 bg-surface p-5 sm:p-6">
      <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">Terms of Service</p>
      <h1 className="editorial-heading mt-2 text-3xl font-semibold">AMP Terms</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">1. Product Definition</h2>
        <p className="text-sm text-muted">
          AMP means <strong>All My Prompts</strong>, a desktop application for prompt authoring, validation, sharing,
          theme/plugin manifest management, and template packaging.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">2. Acceptable Use</h2>
        <p className="text-sm text-muted">
          You agree to use AMP lawfully and responsibly. You must not use AMP to create, distribute, or automate
          harmful, deceptive, abusive, infringing, or unlawful content.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">3. Shared Content</h2>
        <p className="text-sm text-muted">
          You are responsible for prompts, templates, manifests, and exports you create or distribute. Do not share API
          keys, credentials, personal data, or confidential business information in any exported package.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">4. Plugins and Themes</h2>
        <p className="text-sm text-muted">
          Plugins and themes are user-generated assets and should be treated as untrusted input until reviewed. AMP may
          reject malformed manifests, sanitize tokens, and block unsafe fields.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">5. Marketplace</h2>
        <p className="text-sm text-muted">
          Marketplace features may include paid and free user submissions. Additional publisher terms, moderation rules,
          and payout policies may apply when marketplace publishing is enabled.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">6. Intellectual Property</h2>
        <p className="text-sm text-muted">
          You retain ownership of content you create in AMP. You may only publish content and manifests you have the
          legal right to distribute.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">7. Warranty and Liability</h2>
        <p className="text-sm text-muted">
          AMP is provided "as is" without guarantees of uninterrupted service, security, or fitness for a specific
          purpose. Use at your own discretion.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">8. Contact</h2>
        <p className="text-sm text-muted">
          For policy, legal, or distribution questions, contact the project maintainer through the public repository
          issue tracker and documentation channels.
        </p>
      </section>
    </article>
  )
}
