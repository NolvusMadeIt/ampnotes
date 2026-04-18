export function AboutPage() {
  return (
    <article className="space-y-6 rounded-xl border border-line/20 bg-surface p-5 sm:p-6">
      <header className="space-y-3">
        <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">About</p>
        <h1 className="editorial-heading text-3xl font-semibold">AMP: All My Prompts</h1>
        <p className="text-sm text-muted">
          AMP is a production-first prompt workspace built to help creators and teams design better prompts, validate
          them, package them, and publish reusable assets faster.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">What AMP Does</h2>
        <p className="text-sm text-muted">
          AMP combines prompt writing, structured validation, template libraries, plugin manifests, theme manifests,
          and share/import workflows in one desktop app. It is designed so that reading and editing feel intentional,
          not chaotic.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Why It Was Built</h2>
        <p className="text-sm text-muted">
          Most prompt tools either hide power behind complexity or oversimplify serious prompt work. AMP takes a middle
          path: clean, editorial UI with practical controls that help people go from draft prompt to publishable prompt
          package without context-switching across multiple apps.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">What It Is Good For</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Building reusable prompt libraries for product, engineering, marketing, and support teams.</li>
          <li>Validating prompts before sharing/exporting so public packages stay high quality.</li>
          <li>Publishing plugin/theme manifests for internal teams or future marketplace release.</li>
          <li>Running a creator workflow where each prompt can become a template, bundle, or premium asset.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Monetization Path</h2>
        <p className="text-sm text-muted">
          AMP is structured for a marketplace phase where creators can distribute curated prompt packs, branded themes,
          and utility plugins. The desktop app already supports manifest-based packaging and controlled import/export so
          those assets can be sold, licensed, or shared with confidence.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Built By</h2>
        <p className="text-sm text-muted">
          AMP is created by <strong>NolvusMadeIt</strong> and built to scale from solo creator workflows to team-level
          prompt operations.
        </p>
      </section>
    </article>
  )
}
