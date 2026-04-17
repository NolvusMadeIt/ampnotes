import { Pencil } from 'lucide-react'
import type { PromptDTO } from '@shared/types'
import { Button } from '@renderer/components/ui/Button'
import { GroqIcon } from '@renderer/components/ui/GroqIcon'

interface PromptReaderProps {
  prompt: PromptDTO | null
  onUsePrompt: (prompt: PromptDTO) => void
  onImprovePrompt: (prompt: PromptDTO) => void
}

export function PromptReader({ prompt, onUsePrompt, onImprovePrompt }: PromptReaderProps) {
  if (!prompt) {
    return (
      <section className="rounded-xl border border-dashed border-line/20 bg-surface p-6 text-sm text-muted">
        Select a prompt to read it here.
      </section>
    )
  }

  const providerLabel = prompt.validationProvider
    ? `${prompt.validationProvider.charAt(0).toUpperCase()}${prompt.validationProvider.slice(1)}`
    : 'Groq'
  const isGroqProvider = providerLabel.toLowerCase() === 'groq'

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-xl border border-line/20 bg-surface">
      <header className="border-b border-line/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mono-meta text-xs uppercase tracking-[0.2em] text-muted">Read View</p>
            <h2 className="editorial-heading mt-1 text-2xl font-semibold sm:text-3xl">{prompt.title}</h2>
            <p className="mt-1 text-xs text-muted">
              Added on {new Date(prompt.createdAt).toLocaleDateString()}
            </p>
            {prompt.validatedAt && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                {`Validated on ${new Date(prompt.validatedAt).toLocaleDateString()} by ${providerLabel}`}
                {isGroqProvider && <GroqIcon size={12} />}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="scroll-y flex-1 overflow-y-auto p-4">
        <article className="rounded-xl border border-line/20 bg-surface2 p-4">
          <p className="whitespace-pre-wrap text-[1.02rem] leading-8 text-text">{prompt.content}</p>
        </article>
      </div>

      <footer className="border-t border-line/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onUsePrompt(prompt)}
          >
            <Pencil size={14} className="mr-2 text-black" />
            Use this prompt
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onImprovePrompt(prompt)}>
            <GroqIcon size={13} className="mr-1.5" />
            Help me improve
          </Button>
        </div>
      </footer>
    </section>
  )
}
