import { useMemo, useRef, useState } from 'react'
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListTodo,
  Quote,
  WandSparkles
} from 'lucide-react'
import type { CreatePromptInput, RefinementResult } from '@shared/types'
import { formatPromptValidationIssues, validatePromptForSave } from '@shared/validation/prompt'
import { Modal } from '@renderer/components/ui/Modal'
import { Button } from '@renderer/components/ui/Button'
import { CategoryInput } from '@renderer/components/prompt/CategoryInput'
import { TagsInput } from '@renderer/components/prompt/TagsInput'
import { HelpTooltip } from '@renderer/components/ui/HelpTooltip'

interface NewPromptModalProps {
  open: boolean
  isRefineConfigured: boolean
  isRefining: boolean
  categorySuggestions: string[]
  tagSuggestions: string[]
  onClose: () => void
  onConfigureRefine: () => void
  onCreate: (input: CreatePromptInput) => Promise<void>
  onRefine: (content: string) => Promise<RefinementResult>
}

interface DraftState {
  title: string
  category: string
  tags: string[]
  useCase: string
  aiTarget: string
  content: string
}

const INITIAL_DRAFT: DraftState = {
  title: '',
  category: 'General',
  tags: [],
  useCase: '',
  aiTarget: '',
  content: ''
}

function buildMarkdownWrap(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix = prefix
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = source.slice(selectionStart, selectionEnd)
  const replacement = `${prefix}${selected || 'text'}${suffix}`
  const value = `${source.slice(0, selectionStart)}${replacement}${source.slice(selectionEnd)}`

  const nextStart = selectionStart + prefix.length
  const nextEnd = nextStart + (selected || 'text').length

  return { value, selectionStart: nextStart, selectionEnd: nextEnd }
}

function buildMarkdownPrefix(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = source.slice(selectionStart, selectionEnd)
  const replacement = `${prefix}${selected || 'item'}`
  const value = `${source.slice(0, selectionStart)}${replacement}${source.slice(selectionEnd)}`
  const nextStart = selectionStart + prefix.length
  const nextEnd = nextStart + (selected || 'item').length
  return { value, selectionStart: nextStart, selectionEnd: nextEnd }
}

export function NewPromptModal({
  open,
  isRefineConfigured,
  isRefining,
  categorySuggestions,
  tagSuggestions,
  onClose,
  onConfigureRefine,
  onCreate,
  onRefine
}: NewPromptModalProps) {
  const [draft, setDraft] = useState<DraftState>(INITIAL_DRAFT)
  const [refinement, setRefinement] = useState<RefinementResult | null>(null)
  const [isUsingRefined, setIsUsingRefined] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const createdLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    []
  )

  const applyEditorChange = (
    operation: (
      source: string,
      selectionStart: number,
      selectionEnd: number
    ) => { value: string; selectionStart: number; selectionEnd: number }
  ) => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    const result = operation(draft.content, textarea.selectionStart, textarea.selectionEnd)
    setDraft((prev) => ({ ...prev, content: result.value }))

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  const resetState = () => {
    setDraft(INITIAL_DRAFT)
    setRefinement(null)
    setIsUsingRefined(false)
    setShowAdvanced(false)
    setValidationMessage(null)
  }

  const closeModal = () => {
    resetState()
    onClose()
  }

  const toolbar = [
    {
      id: 'h1',
      label: 'H1',
      icon: Heading1,
      run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '# '))
    },
    {
      id: 'h2',
      label: 'H2',
      icon: Heading2,
      run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '## '))
    },
    {
      id: 'bold',
      label: 'Bold',
      icon: Bold,
      run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '**'))
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: Italic,
      run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '*'))
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: Quote,
      run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '> '))
    },
    {
      id: 'list',
      label: 'List',
      icon: List,
      run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '- '))
    },
    {
      id: 'todo',
      label: 'Todo',
      icon: ListTodo,
      run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '- [ ] '))
    },
    {
      id: 'code',
      label: 'Code',
      icon: Code2,
      run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '```\n', '\n```'))
    },
    {
      id: 'link',
      label: 'Link',
      icon: Link2,
      run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '[', '](https://)'))
    }
  ]

  return (
    <Modal open={open} onClose={closeModal} title="New Prompt Page" widthClass="max-w-5xl">
      <div className="space-y-4 rounded-2xl border border-line/20 bg-surface p-4 md:p-6">
        {validationMessage && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {validationMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-line/20 pb-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
              Title
              <HelpTooltip text="Required. Use a clear, specific name." />
            </div>
            <input
              autoFocus
              className="editorial-heading w-full border-none bg-transparent text-3xl font-semibold outline-none placeholder:text-muted md:text-4xl"
              placeholder="Prompt title"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            />
            <div className="max-w-xs">
              <CategoryInput
                label=""
                className="w-full"
                value={draft.category}
                onChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}
                placeholder="Category"
                suggestions={categorySuggestions}
              />
            </div>
          </div>
          <div className="rounded-xl border border-line/20 bg-surface2 px-4 py-3 text-sm text-muted">
            <p className="mono-meta text-xs uppercase tracking-wide">Added on: {createdLabel}</p>
            {refinement ? (
              <p className="mt-1 text-success">Improved draft is ready to review.</p>
            ) : (
              <p className="mt-1 text-muted">No AI improvement yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-line/20 bg-surface2 p-3">
          <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
            Prompt content (Markdown)
            <HelpTooltip text="Required. Write your full markdown prompt here." />
          </div>
          <div className="mb-3 rounded-md border border-line/20 bg-surface px-3 py-2 text-xs text-muted">
            Keep this simple: what you want, what to avoid, and the output format.
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-line/20 pb-3">
            {toolbar.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-md border border-line/20 bg-surface px-2.5 py-1 text-xs text-text hover:border-accent/10"
                  onClick={item.run}
                  type="button"
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              )
            })}
          </div>

          <textarea
            ref={textareaRef}
            className="paper-surface min-h-[260px] w-full rounded-lg border border-line/20 bg-surface pr-3 pl-[4rem] py-3 text-[15px] leading-7 outline-none focus:border-accent/10"
            placeholder="Write your reusable prompt in markdown..."
            value={isUsingRefined && refinement ? refinement.refinedContent : draft.content}
            onChange={(event) => {
              setIsUsingRefined(false)
              setDraft((prev) => ({ ...prev, content: event.target.value }))
            }}
          />
        </div>

        <div className="border-t border-line/20 pt-2">
          <button
            type="button"
            className="text-sm font-medium text-muted hover:text-text"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Hide more options' : 'Show more options'}
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-3 rounded-xl border border-line/20 bg-surface2/60 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 inline-flex items-center gap-1.5 font-medium">
                  Use case
                  <HelpTooltip text="Required for sharing/exporting. Describe where this prompt is used." />
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 text-sm outline-none focus:border-accent/10"
                  placeholder="Example: Weekly client summaries"
                  value={draft.useCase}
                  onChange={(event) => setDraft((prev) => ({ ...prev, useCase: event.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 inline-flex items-center gap-1.5 font-medium">
                  AI target
                  <HelpTooltip text="Required for sharing/exporting. Example: ChatGPT, Claude, Gemini." />
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 text-sm outline-none focus:border-accent/10"
                  placeholder="ChatGPT, Claude, Copilot"
                  value={draft.aiTarget}
                  onChange={(event) => setDraft((prev) => ({ ...prev, aiTarget: event.target.value }))}
                />
              </label>
            </div>

            <TagsInput
              tags={draft.tags}
              onChange={(tags) => setDraft((prev) => ({ ...prev, tags }))}
              suggestions={tagSuggestions}
              label="Tags"
              placeholder="Add tags (Enter or comma)"
            />
          </div>
        )}

        {refinement && (
          <div className="grid gap-2 rounded-xl border border-line/20 bg-surface2 p-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Original</p>
              <textarea
                readOnly
                value={draft.content}
                className="min-h-[120px] w-full rounded-lg border border-line/20 bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Refined</p>
              <textarea
                readOnly
                value={refinement.refinedContent}
                className="min-h-[120px] w-full rounded-lg border border-line/20 bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isUsingRefined ? 'primary' : 'secondary'}
                onClick={() => setIsUsingRefined(true)}
                type="button"
              >
                Use refined text
              </Button>
              <Button
                size="sm"
                variant={!isUsingRefined ? 'primary' : 'secondary'}
                onClick={() => setIsUsingRefined(false)}
                type="button"
              >
                Keep original text
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/20 pt-3">
          <Button
            type="button"
            variant="secondary"
            disabled={isRefining || !draft.content.trim()}
            onClick={async () => {
              if (!isRefineConfigured) {
                onConfigureRefine()
                return
              }
              const result = await onRefine(draft.content)
              setRefinement(result)
              setIsUsingRefined(true)
            }}
          >
            <WandSparkles size={14} className="mr-2" />
            {isRefining ? 'Improving...' : 'Improve Draft'}
          </Button>
          {!isRefineConfigured && (
            <p className="text-xs text-muted">
              Groq key not set yet. Click `Improve Draft` to open Settings.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={closeModal} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={
                !(isUsingRefined && refinement ? refinement.refinedContent : draft.content).trim()
              }
              onClick={async () => {
                const contentToSave =
                  isUsingRefined && refinement ? refinement.refinedContent : draft.content
                const issues = validatePromptForSave({
                  title: draft.title,
                  content: contentToSave
                })

                if (issues.length > 0) {
                  setValidationMessage(formatPromptValidationIssues(issues))
                  return
                }
                setValidationMessage(null)

                await onCreate({
                  title: draft.title.trim(),
                  content: contentToSave,
                  category: draft.category.trim() || 'General',
                  tags: draft.tags,
                  useCase: draft.useCase.trim() || undefined,
                  aiTarget: draft.aiTarget.trim() || undefined
                })

                resetState()
              }}
            >
              Save Prompt
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
