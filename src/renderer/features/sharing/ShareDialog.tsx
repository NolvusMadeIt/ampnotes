import { useEffect, useState } from 'react'
import type { PromptDTO, TemplateDTO } from '@shared/types'
import { validatePromptForShare } from '@shared/validation/prompt'
import { Button } from '@renderer/components/ui/Button'
import { HelpTooltip } from '@renderer/components/ui/HelpTooltip'
import { Modal } from '@renderer/components/ui/Modal'

interface ShareDialogProps {
  open: boolean
  prompt: PromptDTO | null
  prompts: PromptDTO[]
  templates: TemplateDTO[]
  shareCode: string
  onClose: () => void
  onGenerate: (promptId: string) => Promise<void>
  onExport: (promptId: string, format: 'json' | 'txt') => Promise<void>
  onExportSelected: (selection: { promptIds: string[]; templateIds: string[] }) => Promise<void>
  onImportCode: (encoded: string) => Promise<void>
  onImportFile: () => Promise<void>
}

export function ShareDialog({
  open,
  prompt,
  prompts,
  templates,
  shareCode,
  onClose,
  onGenerate,
  onExport,
  onExportSelected,
  onImportCode,
  onImportFile
}: ShareDialogProps) {
  const [importCode, setImportCode] = useState('')
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const activePrompt = prompt
  const shareIssues = prompt ? validatePromptForShare(prompt) : []
  const canShare = Boolean(activePrompt) && shareIssues.length === 0

  useEffect(() => {
    if (!open) {
      return
    }
    if (prompt) {
      setSelectedPromptIds((prev) => (prev.includes(prompt.id) ? prev : [prompt.id, ...prev]))
    }
  }, [open, prompt])

  const togglePrompt = (id: string) => {
    setSelectedPromptIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <Modal open={open} onClose={onClose} title="Share and Import" widthClass="max-w-5xl">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-4">
          <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
            Export current prompt
            <HelpTooltip text="Validation is enforced before sharing/exporting to keep prompt packages complete and reusable." />
          </h3>
          <p className="text-sm text-muted">
            Generate a portable local share code or export JSON/TXT package files.
          </p>
          {canShare && activePrompt ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={async () => onGenerate(activePrompt.id)}>
                  Generate Code
                </Button>
                <Button variant="secondary" onClick={async () => onExport(activePrompt.id, 'json')}>
                  Export JSON
                </Button>
                <Button variant="secondary" onClick={async () => onExport(activePrompt.id, 'txt')}>
                  Export TXT
                </Button>
              </div>
              <textarea
                className="min-h-[150px] w-full rounded-lg border border-line/20 bg-surface px-3 py-2 text-xs"
                value={shareCode}
                readOnly
              />
            </>
          ) : prompt ? (
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
              <p className="mb-1 font-semibold">Complete required metadata before sharing:</p>
              <ul className="list-disc pl-5">
                {shareIssues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">Select a prompt first.</p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-4">
          <h3 className="inline-flex items-center gap-1.5 text-base font-semibold">
            Export selected items
            <HelpTooltip text="Only selected prompts/templates are exported. Selected prompts must pass required sharing validation." />
          </h3>
          <div className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Prompts</p>
            <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
              {prompts.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPromptIds.includes(item.id)}
                    onChange={() => togglePrompt(item.id)}
                  />
                  <span>{item.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-line/20 bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Templates</p>
            <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
              {templates.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedTemplateIds.includes(item.id)}
                    onChange={() => toggleTemplate(item.id)}
                  />
                  <span>{item.title}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            disabled={selectedPromptIds.length === 0 && selectedTemplateIds.length === 0}
            onClick={async () => {
              await onExportSelected({
                promptIds: selectedPromptIds,
                templateIds: selectedTemplateIds
              })
            }}
          >
            Export Selected JSON
          </Button>
        </section>
      </div>

      <div className="mt-6">
        <section className="space-y-3 rounded-xl border border-line/20 bg-surface2 p-4">
          <h3 className="text-base font-semibold">Import prompt</h3>
          <p className="text-sm text-muted">Paste a local share code or import from a JSON/TXT file.</p>
          <textarea
            className="min-h-[150px] w-full rounded-lg border border-line/20 bg-surface px-3 py-2 text-xs"
            placeholder="Paste share code"
            value={importCode}
            onChange={(event) => setImportCode(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!importCode.trim()}
              onClick={async () => {
                await onImportCode(importCode)
                setImportCode('')
              }}
            >
              Import Code
            </Button>
            <Button variant="secondary" onClick={onImportFile}>
              Import File
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}
