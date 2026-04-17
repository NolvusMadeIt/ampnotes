import { useState } from 'react'
import type { CreateTemplateInput, TemplateDTO, UpdateTemplateInput } from '@shared/types'
import { Button } from '@renderer/components/ui/Button'

interface TemplatePanelProps {
  templates: TemplateDTO[]
  onUseTemplate: (template: TemplateDTO) => Promise<void>
  onCreateTemplate: (input: CreateTemplateInput) => Promise<void>
  onUpdateTemplate: (input: UpdateTemplateInput) => Promise<void>
  onDeleteTemplate: (template: TemplateDTO) => Promise<void>
}

interface TemplateDraft {
  title: string
  content: string
  category: string
  tagsCsv: string
}

const EMPTY_DRAFT: TemplateDraft = {
  title: '',
  content: '',
  category: '',
  tagsCsv: ''
}

function tagsFromCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function csvFromTags(tags: string[]): string {
  return tags.join(', ')
}

function validateDraft(draft: TemplateDraft): string | null {
  if (draft.title.trim().length < 3) {
    return 'Template title must be at least 3 characters.'
  }
  if (draft.content.trim().length < 12) {
    return 'Template content must be at least 12 characters.'
  }
  return null
}

export function TemplatePanel({
  templates,
  onUseTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate
}: TemplatePanelProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<TemplateDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<TemplateDraft>(EMPTY_DRAFT)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="mono-meta text-xs uppercase tracking-[0.2em] text-muted">Templates</p>
          <p className="text-sm text-muted">Create, edit, and reuse templates.</p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setCreateOpen((prev) => !prev)
            setCreateDraft(EMPTY_DRAFT)
            setErrorMessage(null)
          }}
        >
          {createOpen ? 'Close' : 'New Template'}
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {createOpen && (
        <article className="space-y-3 rounded-xl border border-line/20 bg-surface p-4">
          <h3 className="text-sm font-semibold">Create Template</h3>
          <input
            className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent/10"
            placeholder="Template title"
            value={createDraft.title}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, title: event.target.value }))}
          />
          <textarea
            className="min-h-[160px] w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-sm outline-none focus:border-accent/10"
            placeholder="Template content (markdown supported)"
            value={createDraft.content}
            onChange={(event) => setCreateDraft((prev) => ({ ...prev, content: event.target.value }))}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent/10"
              placeholder="Category (optional)"
              value={createDraft.category}
              onChange={(event) => setCreateDraft((prev) => ({ ...prev, category: event.target.value }))}
            />
            <input
              className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent/10"
              placeholder="Tags comma separated (optional)"
              value={createDraft.tagsCsv}
              onChange={(event) => setCreateDraft((prev) => ({ ...prev, tagsCsv: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false)
                setCreateDraft(EMPTY_DRAFT)
                setErrorMessage(null)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                const validation = validateDraft(createDraft)
                if (validation) {
                  setErrorMessage(validation)
                  return
                }
                setErrorMessage(null)
                await onCreateTemplate({
                  title: createDraft.title.trim(),
                  content: createDraft.content.trim(),
                  category: createDraft.category.trim() || undefined,
                  tags: tagsFromCsv(createDraft.tagsCsv)
                })
                setCreateOpen(false)
                setCreateDraft(EMPTY_DRAFT)
              }}
            >
              Save Template
            </Button>
          </div>
        </article>
      )}

      <div className="space-y-3">
        {templates.map((template) => {
          const isEditing = editingId === template.id

          return (
            <article key={template.id} className="rounded-xl border border-line/20 bg-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{template.title}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {template.category ?? 'General'} · {template.scope === 'system' ? 'System' : 'User'}
                  </p>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] ${
                    template.scope === 'system'
                      ? 'border-line/20 bg-surface2 text-muted'
                      : 'border-accent/20 bg-accent/10 text-text'
                  }`}
                >
                  {template.scope}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <input
                    className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent/10"
                    value={editingDraft.title}
                    onChange={(event) =>
                      setEditingDraft((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                  <textarea
                    className="min-h-[140px] w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-sm outline-none focus:border-accent/10"
                    value={editingDraft.content}
                    onChange={(event) =>
                      setEditingDraft((prev) => ({ ...prev, content: event.target.value }))
                    }
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent/10"
                      value={editingDraft.category}
                      onChange={(event) =>
                        setEditingDraft((prev) => ({ ...prev, category: event.target.value }))
                      }
                    />
                    <input
                      className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent/10"
                      value={editingDraft.tagsCsv}
                      onChange={(event) =>
                        setEditingDraft((prev) => ({ ...prev, tagsCsv: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null)
                        setEditingDraft(EMPTY_DRAFT)
                        setErrorMessage(null)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        const validation = validateDraft(editingDraft)
                        if (validation) {
                          setErrorMessage(validation)
                          return
                        }
                        setErrorMessage(null)
                        await onUpdateTemplate({
                          id: template.id,
                          title: editingDraft.title.trim(),
                          content: editingDraft.content.trim(),
                          category: editingDraft.category.trim() || undefined,
                          tags: tagsFromCsv(editingDraft.tagsCsv)
                        })
                        setEditingId(null)
                        setEditingDraft(EMPTY_DRAFT)
                      }}
                    >
                      Update Template
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="line-clamp-4 text-sm text-muted">{template.content}</p>
                  {template.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span
                          key={`${template.id}-${tag}`}
                          className="rounded-md border border-line/20 bg-surface2 px-2 py-0.5 text-xs text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={async () => onUseTemplate(template)}>
                      Use Template
                    </Button>
                    {template.scope === 'user' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(template.id)
                            setEditingDraft({
                              title: template.title,
                              content: template.content,
                              category: template.category ?? '',
                              tagsCsv: csvFromTags(template.tags)
                            })
                            setErrorMessage(null)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            await onDeleteTemplate(template)
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
