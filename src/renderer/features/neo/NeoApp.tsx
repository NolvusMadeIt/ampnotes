import { useEffect, useMemo, useState } from 'react'
import {
  FilePlus2,
  Filter,
  FolderOpen,
  Heart,
  Import,
  LayoutTemplate,
  PencilLine,
  Pin,
  Search,
  Settings2,
  Sparkles,
  Star,
  TerminalSquare
} from 'lucide-react'
import type { PromptDTO, TemplateDTO } from '@shared/types'
import { formatPromptValidationIssues, validatePromptForSave, validatePromptForShare } from '@shared/validation/prompt'
import { Button } from '@renderer/components/ui/Button'
import { GroqIcon } from '@renderer/components/ui/GroqIcon'
import { TemplatePanel } from '@renderer/features/templates/TemplatePanel'

type NeoLane = 'all' | 'ready' | 'drafts' | 'favorites' | 'recent' | 'templates'
type NeoFocus = 'browse' | 'read' | 'edit'

interface NeoAppProps {
  profileName: string
  prompts: PromptDTO[]
  templates: TemplateDTO[]
  tags: Array<{ name: string; count: number }>
  activeTag: string | null
  latestUpdated: string | null
  selectedPromptId: string | null
  validatingPromptId: string | null
  onSelectPromptId: (id: string | null) => void
  onSelectTag: (tag: string | null) => void
  onCreatePrompt: () => void
  onOpenShareImport: () => void
  onOpenSettings: () => void
  onOpenPlugins: () => void
  onOpenThemes: () => void
  onOpenAbout: () => void
  onOpenTos: () => void
  onOpenMarketplace: () => void
  onCopyPrompt: (prompt: PromptDTO) => Promise<void>
  onSavePrompt: (prompt: PromptDTO, updates: Partial<PromptDTO> & { tags: string[] }) => Promise<void>
  onDeletePrompt: (prompt: PromptDTO) => Promise<void>
  onRefinePrompt: (prompt: PromptDTO) => void
  onValidatePrompt: (prompt: PromptDTO) => Promise<void>
  onSharePrompt: (prompt: PromptDTO) => void
  onAddAsTemplate: (prompt: PromptDTO) => Promise<void>
  onUseTemplate: (template: TemplateDTO) => Promise<void>
  onCreateTemplate: (input: { title: string; content: string; category?: string; tags?: string[] }) => Promise<void>
  onUpdateTemplate: (input: { id: string; title: string; content: string; category?: string; tags?: string[] }) => Promise<void>
  onDeleteTemplate: (template: TemplateDTO) => Promise<void>
}

interface NeoEditorState {
  title: string
  content: string
  category: string
  tags: string[]
  useCase: string
  aiTarget: string
}

function qualityScore(prompt: PromptDTO): number {
  const checks = [
    prompt.title.trim().length > 0,
    prompt.content.trim().length > 0,
    prompt.category.trim().length > 0,
    (prompt.useCase ?? '').trim().length > 0,
    (prompt.aiTarget ?? '').trim().length > 0,
    Boolean(prompt.validatedAt)
  ]
  const complete = checks.filter(Boolean).length
  return Math.round((complete / checks.length) * 100)
}

function excerpt(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  return `${cleaned.slice(0, maxLength).trim()}...`
}

function normalizeProvider(prompt: PromptDTO): string {
  if (!prompt.validationProvider) {
    return 'Groq'
  }
  const value = prompt.validationProvider.trim()
  if (!value) {
    return 'Groq'
  }
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function laneButtonClass(active: boolean): string {
  return `inline-flex w-full items-center gap-2 border px-3 py-2 text-sm transition-colors ${
    active
      ? 'border-accent/35 bg-accent/15 text-text'
      : 'border-line/20 bg-surface text-muted hover:border-accent/20 hover:text-text'
  }`
}

export function NeoApp({
  profileName,
  prompts,
  templates,
  tags,
  activeTag,
  latestUpdated,
  selectedPromptId,
  validatingPromptId,
  onSelectPromptId,
  onSelectTag,
  onCreatePrompt,
  onOpenShareImport,
  onOpenSettings,
  onOpenPlugins,
  onOpenThemes,
  onOpenAbout,
  onOpenTos,
  onOpenMarketplace,
  onCopyPrompt,
  onSavePrompt,
  onDeletePrompt,
  onRefinePrompt,
  onValidatePrompt,
  onSharePrompt,
  onAddAsTemplate,
  onUseTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate
}: NeoAppProps) {
  const [lane, setLane] = useState<NeoLane>('all')
  const [focus, setFocus] = useState<NeoFocus>('browse')
  const [search, setSearch] = useState('')

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId]
  )

  const sortedByRecentUse = useMemo(
    () =>
      [...prompts].sort((a, b) => {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
        return bTime - aTime
      }),
    [prompts]
  )

  const lanePrompts = useMemo(() => {
    const base =
      lane === 'favorites'
        ? prompts.filter((item) => item.favorite)
        : lane === 'recent'
          ? sortedByRecentUse
          : lane === 'ready'
            ? prompts.filter((item) => qualityScore(item) >= 80)
            : lane === 'drafts'
              ? prompts.filter((item) => qualityScore(item) < 80)
              : prompts

    const bySearch =
      search.trim().length === 0
        ? base
        : base.filter((item) => {
            const haystack = `${item.title}\n${item.content}\n${item.category}\n${item.tags.join(' ')}`
            return haystack.toLowerCase().includes(search.trim().toLowerCase())
          })

    if (activeTag) {
      return bySearch.filter((item) => item.tags.includes(activeTag))
    }
    return bySearch
  }, [activeTag, lane, prompts, search, sortedByRecentUse])

  useEffect(() => {
    if (lane === 'templates') {
      setFocus('browse')
    }
  }, [lane])

  const readyCount = prompts.filter((item) => qualityScore(item) >= 80).length
  const draftCount = prompts.length - readyCount

  return (
    <div className="neo-root grid h-full min-h-0 grid-rows-[auto_1fr] gap-3 bg-bg p-3">
      <header className="neo-panel border border-line/20 bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">AMP</p>
            <h1 className="editorial-heading truncate text-[2rem] font-semibold leading-tight text-text">All My Prompts</h1>
            <p className="text-sm text-muted">
              {profileName}, write, validate, package, and ship reusable prompts from one production workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" className="h-9 px-4" onClick={onOpenShareImport}>
              <Import size={14} className="mr-2" />
              Share / Import
            </Button>
            <Button variant="secondary" size="sm" className="h-9 px-4" onClick={onOpenSettings}>
              <Settings2 size={14} className="mr-2" />
              Settings
            </Button>
            <Button variant="secondary" size="sm" className="h-9 px-4" onClick={onOpenPlugins}>
              <Sparkles size={14} className="mr-2" />
              Plugins
            </Button>
            <Button variant="secondary" size="sm" className="h-9 px-4" onClick={onOpenThemes}>
              <LayoutTemplate size={14} className="mr-2" />
              Themes
            </Button>
            <Button variant="primary" size="sm" className="h-9 px-4" onClick={onCreatePrompt}>
              <FilePlus2 size={14} className="mr-2" />
              New Prompt
            </Button>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 gap-3 xl:grid-cols-[220px_minmax(360px,0.95fr)_minmax(620px,1.35fr)]">
        <aside className="neo-panel scroll-y min-h-0 space-y-3 overflow-y-auto border border-line/20 bg-surface p-3">
          <div className="space-y-2">
            <button type="button" className={laneButtonClass(lane === 'all')} onClick={() => setLane('all')}>
              <FolderOpen size={14} />
              All prompts ({prompts.length})
            </button>
            <button type="button" className={laneButtonClass(lane === 'ready')} onClick={() => setLane('ready')}>
              <Star size={14} />
              Ready ({readyCount})
            </button>
            <button type="button" className={laneButtonClass(lane === 'drafts')} onClick={() => setLane('drafts')}>
              <PencilLine size={14} />
              Drafting ({draftCount})
            </button>
            <button type="button" className={laneButtonClass(lane === 'favorites')} onClick={() => setLane('favorites')}>
              <Heart size={14} />
              Favorites
            </button>
            <button type="button" className={laneButtonClass(lane === 'recent')} onClick={() => setLane('recent')}>
              <TerminalSquare size={14} />
              Recently used
            </button>
            <button type="button" className={laneButtonClass(lane === 'templates')} onClick={() => setLane('templates')}>
              <LayoutTemplate size={14} />
              Templates ({templates.length})
            </button>
          </div>

          <div className="border-t border-line/20 pt-3">
            <p className="mono-meta mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Tags</p>
            <button
              type="button"
              className={laneButtonClass(activeTag === null)}
              onClick={() => onSelectTag(null)}
            >
              <Filter size={13} />
              All tags
            </button>
            <div className="mt-2 space-y-1">
              {tags.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  className={laneButtonClass(activeTag === tag.name)}
                  onClick={() => onSelectTag(tag.name)}
                >
                  <span>#{tag.name}</span>
                  <span className="ml-auto text-xs text-muted">{tag.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="neo-panel flex min-h-0 flex-col border border-line/20 bg-surface">
          <div className="border-b border-line/20 px-3 py-2">
            <div className="flex items-center gap-2 rounded-md border border-line/20 bg-surface2 px-2">
              <Search size={14} className="text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search in this lane..."
                className="h-9 w-full border-none bg-transparent px-1 text-sm outline-none"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>{lane === 'templates' ? `${templates.length} templates` : `${lanePrompts.length} prompts`}</span>
              <span>{latestUpdated ? `Updated ${new Date(latestUpdated).toLocaleDateString()}` : 'No updates yet'}</span>
            </div>
          </div>

          <div className="scroll-y min-h-0 flex-1 overflow-y-auto p-3">
            {lane === 'templates' ? (
              <TemplatePanel
                templates={templates}
                onUseTemplate={onUseTemplate}
                onCreateTemplate={onCreateTemplate}
                onUpdateTemplate={onUpdateTemplate}
                onDeleteTemplate={onDeleteTemplate}
              />
            ) : lanePrompts.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <h3 className="editorial-heading text-2xl font-semibold">Nothing in this lane yet</h3>
                  <p className="mt-1 text-sm text-muted">Try another lane or clear filters.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {lanePrompts.map((prompt) => {
                  const score = qualityScore(prompt)
                  const selected = prompt.id === selectedPromptId
                  const provider = normalizeProvider(prompt)
                  const visibleTags = prompt.tags.slice(0, 4)
                  const extraTags = Math.max(0, prompt.tags.length - visibleTags.length)
                  return (
                    <article
                      key={prompt.id}
                      className={`cursor-pointer border p-3 transition-colors ${
                        selected ? 'border-accent/35 bg-accent/10' : 'border-line/20 bg-surface2 hover:border-accent/20'
                      }`}
                      onClick={() => {
                        onSelectPromptId(prompt.id)
                        setFocus('read')
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="editorial-heading truncate text-[1.8rem] font-semibold leading-[1.05]">{prompt.title}</h3>
                          <p className="text-xs text-muted">
                            {prompt.validatedAt
                              ? `Validated on ${new Date(prompt.validatedAt).toLocaleDateString()} by ${provider}`
                              : 'Not validated yet'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted">
                          {prompt.pinned && <Pin size={13} className="text-warning" />}
                          {prompt.favorite && <Heart size={13} className="text-danger" />}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-text">{excerpt(prompt.content, 170)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {visibleTags.map((tag) => (
                          <span key={`${prompt.id}-${tag}`} className="rounded-md border border-line/20 bg-surface px-1.5 py-0.5 text-[11px] text-muted">
                            #{tag}
                          </span>
                        ))}
                        {extraTags > 0 && (
                          <span className="rounded-md border border-line/20 bg-surface px-1.5 py-0.5 text-[11px] text-muted">+{extraTags}</span>
                        )}
                        <span className="ml-auto rounded-md border border-line/20 bg-surface px-1.5 py-0.5 text-[11px] text-muted">
                          Score {score}%
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="neo-panel min-h-0 border border-line/20 bg-surface">
          {selectedPrompt ? (
            <NeoFocusPanel
              prompt={selectedPrompt}
              focus={focus}
              setFocus={setFocus}
              isValidating={validatingPromptId === selectedPrompt.id}
              onCopyPrompt={onCopyPrompt}
              onSavePrompt={onSavePrompt}
              onDeletePrompt={onDeletePrompt}
              onRefinePrompt={onRefinePrompt}
              onValidatePrompt={onValidatePrompt}
              onSharePrompt={onSharePrompt}
              onAddAsTemplate={onAddAsTemplate}
            />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <h3 className="editorial-heading text-3xl font-semibold">Select a prompt</h3>
                <p className="mt-2 max-w-sm text-sm text-muted">
                  Open any prompt from the center lane to read, edit, validate, and publish from one focus panel.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="neo-panel border border-line/20 bg-surface px-4 py-2">
        <div className="grid items-center gap-2 text-sm text-muted sm:grid-cols-[1fr_auto_1fr]">
          <span className="hidden sm:block" />
          <p className="text-center">© {new Date().getFullYear()} AMP</p>
          <div className="flex items-center justify-center gap-3 sm:justify-self-end">
            <button type="button" className="font-medium hover:text-text" onClick={onOpenMarketplace}>
              Marketplace
            </button>
            <span aria-hidden className="text-border">|</span>
            <button type="button" className="font-medium hover:text-text" onClick={onOpenAbout}>
              About
            </button>
            <span aria-hidden className="text-border">|</span>
            <button type="button" className="font-medium hover:text-text" onClick={onOpenTos}>
              ToS
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

interface NeoFocusPanelProps {
  prompt: PromptDTO
  focus: NeoFocus
  setFocus: (mode: NeoFocus) => void
  isValidating: boolean
  onCopyPrompt: (prompt: PromptDTO) => Promise<void>
  onSavePrompt: (prompt: PromptDTO, updates: Partial<PromptDTO> & { tags: string[] }) => Promise<void>
  onDeletePrompt: (prompt: PromptDTO) => Promise<void>
  onRefinePrompt: (prompt: PromptDTO) => void
  onValidatePrompt: (prompt: PromptDTO) => Promise<void>
  onSharePrompt: (prompt: PromptDTO) => void
  onAddAsTemplate: (prompt: PromptDTO) => Promise<void>
}

function NeoFocusPanel({
  prompt,
  focus,
  setFocus,
  isValidating,
  onCopyPrompt,
  onSavePrompt,
  onDeletePrompt,
  onRefinePrompt,
  onValidatePrompt,
  onSharePrompt,
  onAddAsTemplate
}: NeoFocusPanelProps) {
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [form, setForm] = useState<NeoEditorState>({
    title: '',
    content: '',
    category: '',
    tags: [],
    useCase: '',
    aiTarget: ''
  })

  useEffect(() => {
    setForm({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      useCase: prompt.useCase ?? '',
      aiTarget: prompt.aiTarget ?? ''
    })
    setValidationMessage(null)
  }, [prompt])

  const providerLabel = normalizeProvider(prompt)
  const providerFeedback = prompt.validationNotes
    ? prompt.validationNotes.replace(/^pass:\s*/i, '').replace(/^needs_work:\s*/i, '').trim()
    : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line/20 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="mono-meta text-xs uppercase tracking-[0.2em] text-muted">Focus Panel</p>
            <h3 className="editorial-heading text-[1.9rem] font-semibold leading-tight">{prompt.title}</h3>
          </div>
          <div className="inline-flex items-center gap-1 rounded-md border border-line/20 bg-surface2 p-1">
            <button
              type="button"
              className={`px-2 py-1 text-xs ${focus === 'browse' ? 'bg-accent/15 text-text' : 'text-muted'}`}
              onClick={() => setFocus('browse')}
            >
              Summary
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs ${focus === 'read' ? 'bg-accent/15 text-text' : 'text-muted'}`}
              onClick={() => setFocus('read')}
            >
              Read
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-xs ${focus === 'edit' ? 'bg-accent/15 text-text' : 'text-muted'}`}
              onClick={() => setFocus('edit')}
            >
              Edit
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">Added on {new Date(prompt.createdAt).toLocaleDateString()}</p>
        {prompt.validatedAt && (
          <p className="inline-flex items-center gap-1 text-xs text-muted">
            {`Validated on ${new Date(prompt.validatedAt).toLocaleDateString()} by ${providerLabel}`}
            {providerLabel.toLowerCase() === 'groq' && <GroqIcon size={12} />}
          </p>
        )}
      </div>

      <div className="scroll-y min-h-0 flex-1 overflow-y-auto p-3">
        {validationMessage && (
          <div className="mb-3 border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{validationMessage}</div>
        )}
        {providerFeedback && (
          <div className="mb-3 border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-text">
            <p className="font-semibold">{providerLabel} says, &quot;{providerFeedback}&quot;</p>
          </div>
        )}

        {focus === 'browse' && (
          <article className="space-y-3 border border-line/20 bg-surface2 p-4">
            <div>
              <p className="mono-meta text-[10px] uppercase tracking-[0.2em] text-muted">Use case</p>
              <p className="text-sm text-text">{prompt.useCase || 'No use case yet.'}</p>
            </div>
            <div>
              <p className="mono-meta text-[10px] uppercase tracking-[0.2em] text-muted">Target model</p>
              <p className="text-sm text-text">{prompt.aiTarget || 'No AI target yet.'}</p>
            </div>
            <div>
              <p className="mono-meta text-[10px] uppercase tracking-[0.2em] text-muted">Prompt</p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-text">{excerpt(prompt.content, 900)}</p>
            </div>
          </article>
        )}

        {focus === 'read' && (
          <article className="border border-line/20 bg-surface2 p-4">
            <p className="whitespace-pre-wrap text-[1rem] leading-8 text-text">{prompt.content}</p>
          </article>
        )}

        {focus === 'edit' && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Title</span>
              <input
                className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Category</span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Tags (comma separated)</span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.tags.join(', ')}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      tags: event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean)
                    }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Use case</span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.useCase}
                  onChange={(event) => setForm((prev) => ({ ...prev, useCase: event.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">AI target</span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.aiTarget}
                  onChange={(event) => setForm((prev) => ({ ...prev, aiTarget: event.target.value }))}
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Prompt content (Markdown)</span>
              <textarea
                className="min-h-[320px] w-full border border-line/20 bg-surface2 px-3 py-3 leading-7 outline-none focus:border-accent/25"
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              />
            </label>
          </div>
        )}
      </div>

      <footer className="border-t border-line/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            className="h-9 px-4"
            onClick={async () => {
              const issues = validatePromptForSave(form)
              if (issues.length > 0) {
                setValidationMessage(formatPromptValidationIssues(issues))
                return
              }
              setValidationMessage(null)
              await onSavePrompt(prompt, {
                title: form.title.trim(),
                content: form.content,
                category: form.category.trim() || 'General',
                tags: form.tags,
                useCase: form.useCase.trim() || undefined,
                aiTarget: form.aiTarget.trim() || undefined
              })
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="secondary" className="h-9 px-4" onClick={() => onRefinePrompt(prompt)}>
            <Sparkles size={14} className="mr-2" />
            Improve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 px-4"
            disabled={isValidating}
            onClick={async () => {
              const issues = validatePromptForSave(form)
              if (issues.length > 0) {
                setValidationMessage(formatPromptValidationIssues(issues))
                return
              }
              setValidationMessage(null)
              await onValidatePrompt(prompt)
            }}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
          <Button size="sm" variant="secondary" className="h-9 px-4" onClick={() => void onCopyPrompt(prompt)}>
            Copy
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 px-4"
            onClick={() => {
              const issues = validatePromptForShare(form)
              if (issues.length > 0) {
                setValidationMessage(formatPromptValidationIssues(issues))
                return
              }
              setValidationMessage(null)
              onSharePrompt(prompt)
            }}
          >
            Share
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 px-4"
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
                tags: form.tags,
                useCase: form.useCase.trim() || undefined,
                aiTarget: form.aiTarget.trim() || undefined
              })
            }}
          >
            Add as Template
          </Button>
          <Button size="sm" variant="danger" className="h-9 px-4" onClick={() => void onDeletePrompt(prompt)}>
            Delete
          </Button>
        </div>
      </footer>
    </div>
  )
}
