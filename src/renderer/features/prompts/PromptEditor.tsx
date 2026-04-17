import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bold,
  Code2,
  Copy,
  FilePlus2,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListTodo,
  Share2,
  Sigma,
  Quote,
  Sparkles,
  Trash2
} from 'lucide-react'
import type { PromptDTO } from '@shared/types'
import {
  formatPromptValidationIssues,
  validatePromptForSave,
  validatePromptForShare
} from '@shared/validation/prompt'
import { Button } from '@renderer/components/ui/Button'
import { CategoryInput } from '@renderer/components/prompt/CategoryInput'
import { TagsInput } from '@renderer/components/prompt/TagsInput'
import { HelpTooltip } from '@renderer/components/ui/HelpTooltip'
import { GroqIcon } from '@renderer/components/ui/GroqIcon'

interface PromptEditorProps {
  prompt: PromptDTO | null
  categorySuggestions: string[]
  tagSuggestions: string[]
  onSave: (prompt: PromptDTO, updates: Partial<PromptDTO> & { tags: string[] }) => Promise<void>
  onDelete: (prompt: PromptDTO) => Promise<void>
  onRefine: (prompt: PromptDTO) => void
  onValidate: (prompt: PromptDTO) => Promise<void>
  onShare: (prompt: PromptDTO) => void
  onAddAsTemplate: (prompt: PromptDTO) => Promise<void>
  isValidating: boolean
  enabledPluginIds: string[]
}

interface EditorState {
  title: string
  content: string
  category: string
  tags: string[]
  useCase: string
  aiTarget: string
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

export function PromptEditor({
  prompt,
  categorySuggestions,
  tagSuggestions,
  onSave,
  onDelete,
  onRefine,
  onValidate,
  onShare,
  onAddAsTemplate,
  isValidating,
  enabledPluginIds
}: PromptEditorProps) {
  const [form, setForm] = useState<EditorState>({
    title: '',
    content: '',
    category: '',
    tags: [],
    useCase: '',
    aiTarget: ''
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!prompt) {
      setForm({ title: '', content: '', category: '', tags: [], useCase: '', aiTarget: '' })
      setShowAdvanced(false)
      setValidationMessage(null)
      return
    }

    setForm({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      useCase: prompt.useCase ?? '',
      aiTarget: prompt.aiTarget ?? ''
    })
    setShowAdvanced(false)
    setValidationMessage(null)
  }, [prompt])

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

    const result = operation(form.content, textarea.selectionStart, textarea.selectionEnd)
    setForm((prev) => ({ ...prev, content: result.value }))

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  const toolbar = useMemo(
    () => [
      { id: 'h1', label: 'H1', icon: Heading1, run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '# ')) },
      { id: 'h2', label: 'H2', icon: Heading2, run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '## ')) },
      { id: 'bold', label: 'Bold', icon: Bold, run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '**')) },
      { id: 'italic', label: 'Italic', icon: Italic, run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '*')) },
      { id: 'quote', label: 'Quote', icon: Quote, run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '> ')) },
      { id: 'list', label: 'List', icon: List, run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '- ')) },
      { id: 'todo', label: 'Todo', icon: ListTodo, run: () => applyEditorChange((s, a, b) => buildMarkdownPrefix(s, a, b, '- [ ] ')) },
      { id: 'code', label: 'Code', icon: Code2, run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '```\n', '\n```')) },
      { id: 'link', label: 'Link', icon: Link2, run: () => applyEditorChange((s, a, b) => buildMarkdownWrap(s, a, b, '[', '](https://)')) }
    ],
    [form.content]
  )

  const providerLabel = useMemo(() => {
    if (!prompt?.validationProvider) {
      return 'Validator'
    }
    const normalized = prompt.validationProvider.trim()
    if (!normalized) {
      return 'Validator'
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }, [prompt?.validationProvider])
  const isGroqProvider = useMemo(() => providerLabel.toLowerCase() === 'groq', [providerLabel])

  const providerFeedback = useMemo(() => {
    if (!prompt?.validationNotes) {
      return null
    }
    return prompt.validationNotes.replace(/^pass:\s*/i, '').replace(/^needs_work:\s*/i, '').trim()
  }, [prompt?.validationNotes])

  const supportsWordCountPlugin = useMemo(
    () => enabledPluginIds.includes('tools.wordcount') || enabledPluginIds.includes('wordcount'),
    [enabledPluginIds]
  )
  const wordCount = useMemo(() => {
    const words = form.content.trim().match(/\S+/g)
    return words ? words.length : 0
  }, [form.content])
  const wordCountTokenRegex = useMemo(() => /\{(?:tools\.)?wordcount\}/gi, [])
  const hasWordCountToken = useMemo(
    () => form.content.match(wordCountTokenRegex) !== null,
    [form.content, wordCountTokenRegex]
  )

  if (!prompt) {
    return (
      <section className="rounded-xl border border-dashed border-line/20 bg-surface p-6 text-sm text-muted">
        Select a prompt from the center list to edit it here.
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-[420px] flex-col rounded-xl border border-line/20 bg-surface">
      <header className="border-b border-line/20 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mono-meta text-xs uppercase tracking-[0.2em] text-muted">Page Editor</p>
            <h2 className="editorial-heading mt-1 text-2xl font-semibold sm:text-3xl">
              {form.title.trim() || 'Untitled Page'}
            </h2>
            {prompt.validatedAt && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                {`Validated on ${new Date(prompt.validatedAt).toLocaleDateString()} by ${providerLabel}`}
                {isGroqProvider && <GroqIcon size={12} />}
              </p>
            )}
          </div>
          <span className="mono-meta text-xs uppercase tracking-wide text-muted">
            Updated {new Date(prompt.updatedAt).toLocaleString()}
          </span>
        </div>
      </header>

      <div className="scroll-y flex-1 space-y-4 overflow-y-auto p-4">
        {validationMessage && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {validationMessage}
          </div>
        )}
        {providerFeedback && (
          <div className="rounded-lg border border-accent/10 bg-accent/10 px-3 py-2 text-sm text-text">
            <p className="font-semibold">{providerLabel} says, &quot;{providerFeedback}&quot;</p>
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 inline-flex items-center gap-1.5 font-medium">
            Title
            <HelpTooltip text="Required. Keep it short and specific so shared prompts are easy to scan." />
          </span>
          <input
            className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/10"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </label>

        <div className="rounded-xl border border-line/20 bg-surface2 p-3">
          <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
            Prompt content (Markdown)
            <HelpTooltip text="Required. This is your markdown prompt body. Toolbar buttons insert markdown syntax." />
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
            {supportsWordCountPlugin && (
              <button
                className="inline-flex items-center gap-1 rounded-md border border-line/20 bg-surface px-2.5 py-1 text-xs text-text hover:border-accent/10"
                onClick={() =>
                  applyEditorChange((source, selectionStart, selectionEnd) => {
                    const token = '{tools.wordcount}'
                    const value = `${source.slice(0, selectionStart)}${token}${source.slice(selectionEnd)}`
                    const cursor = selectionStart + token.length
                    return { value, selectionStart: cursor, selectionEnd: cursor }
                  })
                }
                type="button"
                title="Insert word count plugin token"
              >
                <Sigma size={14} />
                WordCount
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              className={`paper-surface min-h-[260px] w-full rounded-lg border border-line/20 bg-surface pr-3 pl-[4rem] py-3 text-[15px] leading-7 outline-none focus:border-accent/10 ${
                supportsWordCountPlugin ? 'pb-10' : ''
              }`}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
            {supportsWordCountPlugin && (
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-line/20 bg-surface/95 px-2.5 py-1 text-[11px] font-medium text-muted shadow-sm">
                {hasWordCountToken ? `{wordcount}: ${wordCount}` : `Word count: ${wordCount}`}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-line/20 pt-3">
          <button
            type="button"
            className="text-sm font-medium text-muted hover:text-text"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? 'Hide more options' : 'Show more options'}
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg border border-line/20 bg-surface2/50 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium">
                  Category
                  <HelpTooltip text="Required for sharing/export. Use a stable category like Marketing, Sales, Support, or Coding." />
                </div>
                <CategoryInput
                  label=""
                  value={form.category}
                  onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
                  suggestions={categorySuggestions}
                />
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium">
                  Tags
                  <HelpTooltip text="Optional but recommended for search. Example: onboarding, copywriting, sql." />
                </div>
                <TagsInput
                  label=""
                  tags={form.tags}
                  onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
                  suggestions={tagSuggestions}
                />
              </div>
            </div>

            <label className="block text-sm">
              <span className="mb-1 inline-flex items-center gap-1.5 font-medium">
                Use case
                <HelpTooltip text="Required for sharing/export. Describe where this prompt should be used." />
              </span>
              <input
                className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 outline-none focus:border-accent/10"
                value={form.useCase}
                onChange={(event) => setForm((prev) => ({ ...prev, useCase: event.target.value }))}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 inline-flex items-center gap-1.5 font-medium">
                AI target
                <HelpTooltip text="Required for sharing/export. Example: ChatGPT, Claude, Gemini, Copilot." />
              </span>
              <input
                className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 outline-none focus:border-accent/10"
                placeholder="ChatGPT, Claude, Copilot..."
                value={form.aiTarget}
                onChange={(event) => setForm((prev) => ({ ...prev, aiTarget: event.target.value }))}
              />
            </label>
          </div>
        )}
      </div>

      <footer className="border-t border-line/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap">
          <div className="flex flex-wrap gap-2 md:flex-nowrap">
            <Button
              size="sm"
              variant="primary"
              className="whitespace-nowrap"
              onClick={async () => {
                const issues = validatePromptForSave(form)
                if (issues.length > 0) {
                  setValidationMessage(formatPromptValidationIssues(issues))
                  return
                }
                setValidationMessage(null)
                await onSave(prompt, {
                  title: form.title,
                  content: form.content,
                  category: form.category,
                  tags: form.tags,
                  useCase: form.useCase || undefined,
                  aiTarget: form.aiTarget || undefined
                })
              }}
            >
              Save Changes
            </Button>
            <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => onRefine(prompt)}>
              <Sparkles size={14} className="mr-2" />
              Improve Prompt
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="whitespace-nowrap"
              onClick={async () => {
                const issues = validatePromptForSave(form)
                if (issues.length > 0) {
                  setValidationMessage(formatPromptValidationIssues(issues))
                  return
                }
                setValidationMessage(null)
                await onValidate(prompt)
              }}
              disabled={isValidating}
            >
              <GroqIcon size={13} className="mr-2" />
              {isValidating ? 'Validating...' : 'Validate Prompt'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="whitespace-nowrap"
              onClick={async () => {
                const issues = validatePromptForSave(form)
                if (issues.length > 0) {
                  setValidationMessage(formatPromptValidationIssues(issues))
                  return
                }
                setValidationMessage(null)
                await navigator.clipboard.writeText(form.content)
              }}
            >
              <Copy size={14} className="mr-2" />
              Copy
            </Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2 md:flex-nowrap">
            <Button
              variant="secondary"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => {
                const issues = validatePromptForShare(form)
                if (issues.length > 0) {
                  setValidationMessage(formatPromptValidationIssues(issues))
                  setShowAdvanced(true)
                  return
                }
                setValidationMessage(null)
                onShare(prompt)
              }}
            >
              <Share2 size={14} className="mr-2" />
              Share / Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="whitespace-nowrap"
              onClick={async () => {
                const issues = validatePromptForSave(form)
                if (issues.length > 0) {
                  setValidationMessage(formatPromptValidationIssues(issues))
                  return
                }
                setValidationMessage(null)
                await onAddAsTemplate({
                  ...prompt,
                  title: form.title.trim(),
                  content: form.content.trim(),
                  category: form.category.trim() || 'General',
                  tags: form.tags
                })
              }}
            >
              <FilePlus2 size={14} className="mr-2" />
              Add as Template
            </Button>
            <Button variant="danger" size="sm" className="whitespace-nowrap" onClick={() => onDelete(prompt)}>
              <Trash2 size={14} className="mr-2" />
              Delete Page
            </Button>
          </div>
        </div>
      </footer>
    </section>
  )
}
