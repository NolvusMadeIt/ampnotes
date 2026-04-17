import { useState } from 'react'
import type { PromptDTO, RefinementResult } from '@shared/types'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'

interface RefineModalProps {
  open: boolean
  prompt: PromptDTO | null
  configured: boolean
  isLoading: boolean
  result: RefinementResult | null
  onClose: () => void
  onRun: (goals: string, preserveIntent: boolean) => Promise<void>
  onApply: (mode: 'replace' | 'variant') => Promise<void>
}

export function RefineModal({
  open,
  prompt,
  configured,
  isLoading,
  result,
  onClose,
  onRun,
  onApply
}: RefineModalProps) {
  const [goals, setGoals] = useState('Improve clarity, structure, and output formatting guidance.')
  const [preserveIntent, setPreserveIntent] = useState(true)

  return (
    <Modal open={open} onClose={onClose} title="Improve Prompt">
      {!prompt ? null : (
        <div className="space-y-4">
          <div className="rounded-lg border border-line/20 bg-surface2/70 px-3 py-2 text-sm text-muted">
            Step 1: set what should improve. Step 2: generate an improved draft. Step 3: pick how to save it.
          </div>

          {!configured && (
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
              Add a Groq API key in Settings before running refinement.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">What should improve?</span>
              <textarea
                className="min-h-[110px] w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 outline-none focus:border-accent/10"
                value={goals}
                onChange={(event) => setGoals(event.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Original</span>
              <textarea
                readOnly
                className="min-h-[110px] w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-muted"
                value={prompt.content}
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preserveIntent}
              onChange={(event) => setPreserveIntent(event.target.checked)}
            />
            Preserve original intent
          </label>

          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={!configured || isLoading || !prompt.content.trim()}
              onClick={async () => onRun(goals, preserveIntent)}
            >
              {isLoading ? 'Generating...' : 'Generate Improved Draft'}
            </Button>
          </div>

          {result && (
            <div className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-3">
              <p className="mono-meta text-xs uppercase tracking-wide text-muted">
                {result.providerId} · {result.model}
              </p>
              <textarea
                readOnly
                className="min-h-[220px] w-full rounded-lg border border-line/20 bg-surface px-3 py-2"
                value={result.refinedContent}
              />
              <p className="text-xs text-muted">
                Choose replace to overwrite this prompt, or save variant to keep both versions.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="primary" onClick={async () => onApply('replace')}>
                  Replace Current Prompt
                </Button>
                <Button variant="secondary" onClick={async () => onApply('variant')}>
                  Save as New Variant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
