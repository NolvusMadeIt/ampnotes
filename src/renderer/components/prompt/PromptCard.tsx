import type { DragEvent, MouseEvent } from 'react'
import { CopyCheck, GripVertical, Heart, Pin, Sparkles } from 'lucide-react'
import type { PromptDTO } from '@shared/types'
import { cn } from '@renderer/lib/cn'
import { GroqIcon } from '@renderer/components/ui/GroqIcon'

interface PromptCardProps {
  prompt: PromptDTO
  selected: boolean
  isTemplateCopy?: boolean
  reorderEnabled?: boolean
  dragging?: boolean
  onSelect: () => void
  onContextMenu: (event: MouseEvent<HTMLElement>) => void
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDrop?: (event: DragEvent<HTMLElement>) => void
  onDragEnd?: () => void
}

export function PromptCard({
  prompt,
  selected,
  isTemplateCopy = false,
  reorderEnabled = false,
  dragging = false,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: PromptCardProps) {
  const providerLabel = prompt.validationProvider
    ? `${prompt.validationProvider.charAt(0).toUpperCase()}${prompt.validationProvider.slice(1)}`
    : 'Groq'
  const isGroqProvider = providerLabel.toLowerCase() === 'groq'
  const visibleTags = prompt.tags.slice(0, 4)
  const hiddenTagCount = Math.max(0, prompt.tags.length - visibleTags.length)
  const statusIcons = [
    prompt.refinedVersion ? { label: 'Refined', icon: Sparkles, className: 'text-accent' } : null,
    prompt.pinned ? { label: 'Pinned', icon: Pin, className: 'text-warning' } : null,
    prompt.favorite ? { label: 'Favorited', icon: Heart, className: 'text-danger' } : null,
    isTemplateCopy ? { label: 'Template copy', icon: CopyCheck, className: 'text-success' } : null
  ].filter(Boolean) as Array<{
    label: string
    icon: typeof Sparkles
    className: string
  }>

  return (
    <article
      className={cn(
        'group cursor-pointer rounded-xl border px-4 py-3 transition-colors',
        selected ? 'border-accent/10 bg-accent/10' : 'border-line/20 bg-surface hover:bg-surface2/60',
        dragging && 'opacity-45'
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {reorderEnabled && (
            <button
              type="button"
              draggable
              className="mt-1 inline-flex cursor-grab items-center text-muted opacity-70 transition-opacity hover:text-text hover:opacity-100 active:cursor-grabbing"
              aria-label={`Drag ${prompt.title} to reorder`}
              title="Drag to reorder"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onDragStart={onDragStart}
            >
              <GripVertical size={15} />
            </button>
          )}
          <h3 className="line-clamp-1 editorial-heading text-2xl font-semibold text-text">{prompt.title}</h3>
        </div>
        <div className="shrink-0 text-right">
          {statusIcons.length > 0 && (
            <div className="mb-1 flex justify-end gap-1.5">
              {statusIcons.map((item) => {
                const Icon = item.icon
                return <Icon key={item.label} size={13} className={item.className} aria-label={item.label} />
              })}
            </div>
          )}
          <p className="text-xs text-muted">Added on: {new Date(prompt.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted">
        {prompt.validatedAt ? (
          <p className="inline-flex items-center gap-1">
            {`Validated on ${new Date(prompt.validatedAt).toLocaleDateString()} by ${providerLabel}`}
            {isGroqProvider && <GroqIcon size={12} />}
          </p>
        ) : (
          <p>Not validated yet</p>
        )}
      </div>

      {(visibleTags.length > 0 || hiddenTagCount > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <span key={tag} className="bg-surface2 px-2 py-0.5 text-[11px] text-muted">
              #{tag}
            </span>
          ))}
          {hiddenTagCount > 0 && (
            <span className="relative inline-flex h-5 min-w-9 items-center justify-center">
              <span className="absolute left-0 h-5 w-7 border border-line/20 bg-surface2" />
              <span className="absolute left-1 h-5 w-7 border border-line/20 bg-surface2" />
              <span className="relative left-2 h-5 min-w-8 border border-line/20 bg-surface px-1.5 text-center text-[10px] leading-5 text-muted">
                +{hiddenTagCount}
              </span>
            </span>
          )}
        </div>
      )}
    </article>
  )
}
