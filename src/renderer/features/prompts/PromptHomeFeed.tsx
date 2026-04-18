import { Folder, Pencil } from 'lucide-react'
import type { PromptDTO } from '@shared/types'
import { Button } from '@renderer/components/ui/Button'
import { GroqIcon } from '@renderer/components/ui/GroqIcon'

interface PromptHomeFeedProps {
  prompts: PromptDTO[]
  onReadPrompt: (prompt: PromptDTO) => void
  onUsePrompt: (prompt: PromptDTO) => void
  onImprovePrompt: (prompt: PromptDTO) => void
}

function excerpt(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  return `${cleaned.slice(0, maxLength).trim()}...`
}

function providerName(prompt: PromptDTO): string {
  if (!prompt.validationProvider) {
    return 'Groq'
  }
  return `${prompt.validationProvider.charAt(0).toUpperCase()}${prompt.validationProvider.slice(1)}`
}

export function PromptHomeFeed({
  prompts,
  onReadPrompt,
  onUsePrompt,
  onImprovePrompt
}: PromptHomeFeedProps) {
  if (prompts.length === 0) {
    return (
      <section className="grid h-full min-h-[420px] place-items-center bg-bg p-6 text-center">
        <div>
          <h2 className="editorial-heading text-3xl font-semibold">No prompts yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">Create a page and it will show up here.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="scroll-y h-full min-h-[420px] overflow-y-auto bg-bg px-3 py-4 sm:px-4 xl:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        {prompts.map((prompt) => {
          const label = providerName(prompt)
          const isGroq = label.toLowerCase() === 'groq'
          const description = excerpt(prompt.useCase || prompt.content, 260)
          const buildPrompt = excerpt(prompt.content, 420)
          const journey = prompt.aiTarget
            ? `The primary target is ${prompt.aiTarget}.`
            : 'The primary user journey works like this: On first use...'

          return (
            <article key={prompt.id} className="border border-line/20 bg-surface p-4 shadow-panel">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="editorial-heading text-2xl font-semibold text-text">{prompt.title}</h2>
                  <div className="mt-3 inline-flex items-center gap-2 bg-surface2 px-2.5 py-1 text-xs text-text">
                    <Folder size={13} className="text-accent" />
                    <span>{prompt.category || 'General'}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-[11px] leading-4 text-muted">
                  <p>Added on: {new Date(prompt.createdAt).toLocaleDateString()}</p>
                  {prompt.validatedAt ? (
                    <p className="inline-flex items-center justify-end gap-1">
                      {`Validated on ${new Date(prompt.validatedAt).toLocaleDateString()} using ${label}`}
                      {isGroq && <GroqIcon size={11} />}
                    </p>
                  ) : (
                    <p>Not validated yet</p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-text">{description}</p>

              <div className="mt-4 border-t border-line/20 pt-3">
                <p className="text-sm font-semibold text-text">Build Prompt:</p>
                <p className="mt-1 text-xs leading-5 text-text">{buildPrompt}</p>
              </div>

              <p className="mt-4 text-xs leading-5 text-muted">{journey}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-accent hover:text-text"
                onClick={() => onReadPrompt(prompt)}
              >
                Show more
              </button>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onUsePrompt(prompt)}
                >
                  <Pencil size={14} className="mr-2 text-black" />
                  Use this prompt
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onImprovePrompt(prompt)}
                >
                  <GroqIcon size={13} className="mr-1.5" />
                  Help me improve
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
