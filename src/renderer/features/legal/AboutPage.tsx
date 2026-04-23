import { useEffect } from 'react'

declare global {
  interface Window {
    kofiwidget2?: {
      init: (label: string, color: string, userId: string) => void
      draw: () => void
    }
  }
}

export function AboutPage() {
  useEffect(() => {
    const scriptId = 'kofi-widget-script'
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existingScript) {
      if (window.kofiwidget2) {
        window.kofiwidget2.init('Support and Visit the Shop', '#bd4200', 'H2H54FELU')
        window.kofiwidget2.draw()
      }
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.type = 'text/javascript'
    script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js'
    script.onload = () => {
      if (window.kofiwidget2) {
        window.kofiwidget2.init('Support and Visit the Shop', '#bd4200', 'H2H54FELU')
        window.kofiwidget2.draw()
      }
    }
    document.body.appendChild(script)
  }, [])

  return (
    <article className="space-y-6 rounded-xl border border-line/20 bg-surface p-5 sm:p-6">
      <header className="space-y-3">
        <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">About AMP</p>
        <h1 className="editorial-heading text-3xl font-semibold">AMP: All My Prompts</h1>
        <p className="text-sm leading-7 text-muted">
          AMP is a desktop-first prompt operations workspace for creators, developers, and teams who need more than a
          scratchpad. It combines structured prompt authoring, markdown-focused reading/editing, quality validation,
          template reuse, and marketplace-ready packaging into a single, production-focused workflow.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Product Mission</h2>
        <p className="text-sm leading-7 text-muted">
          The mission is simple: help people design better prompts faster, keep them organized over time, and safely
          move from draft to reusable asset. AMP is intentionally built for repeatable output quality and long-term
          prompt libraries, not one-off copy/paste work.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Core Capabilities</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-muted">
          <li>Three-lane workflow: navigation, prompt list, and focus panel.</li>
          <li>Read, Summary, and Edit prompt modes with markdown support.</li>
          <li>Prompt validation and refinement with optional provider integration.</li>
          <li>Template conversion and reuse for faster content/system prompt generation.</li>
          <li>File-backed plugin and theme manifest management.</li>
          <li>Marketplace integration for discover/install workflows.</li>
          <li>Settings-driven typography, themes, update behavior, and admin controls.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Who AMP Is For</h2>
        <p className="text-sm leading-7 text-muted">
          AMP is designed for serious AI builders: solo creators shipping content, prompt engineers developing reusable
          systems, agencies maintaining client prompt stacks, and internal teams standardizing AI operations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Architecture Direction</h2>
        <p className="text-sm leading-7 text-muted">
          AMP uses a local-first desktop architecture with typed IPC contracts, file-backed marketplace assets, and a
          release pipeline that supports installer-based upgrades. The platform is built to scale into full user auth,
          verified purchases, and controlled premium distribution without sacrificing local productivity.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="editorial-heading text-xl font-semibold">Built By</h2>
        <p className="text-sm leading-7 text-muted">
          AMP is created by <strong>NolvusMadeIt</strong>. The product vision focuses on practical power: advanced
          capabilities, clear UX, and workflows that make day-to-day prompt work feel intentional and reliable.
        </p>
      </section>

      <section className="space-y-2 border-t border-line/20 pt-4">
        <h2 className="editorial-heading text-xl font-semibold">Support AMP</h2>
        <p className="text-sm leading-7 text-muted">
          If AMP helps your workflow, you can support ongoing development and visit the creator shop below.
        </p>
        <div id="kofi-widget-container" className="min-h-[48px]" />
      </section>
    </article>
  )
}
