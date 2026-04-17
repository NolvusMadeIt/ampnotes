export function AboutPage() {
  return (
    <article className="rounded-xl border border-line/20 bg-surface p-5 sm:p-6">
      <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">About</p>
      <h1 className="editorial-heading mt-2 text-3xl font-semibold">AMP</h1>
      <p className="mt-3 text-sm text-muted">
        AMP stands for <strong>Adaptive Markdown Prompts</strong>. It is built for writing, improving, validating,
        and sharing prompts with a clean notebook-style workflow.
      </p>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Vision</h2>
        <p className="text-sm text-muted">
          AMP is designed to feel simple and readable first, then powerful when you need it. You can browse prompts
          like blog posts, switch to edit mode when needed, and keep templates/themes/plugins in one place.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Created By</h2>
        <p className="text-sm text-muted">
          AMP is created and maintained by <strong>NolvusMadeIt</strong>.
        </p>
      </section>
    </article>
  )
}
