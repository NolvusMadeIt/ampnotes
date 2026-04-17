import { type ComponentType, useEffect, useMemo } from 'react'
import {
  Copy,
  Pencil,
  Pin,
  Share2,
  Sparkles,
  Star,
  Trash2,
  CopyPlus
} from 'lucide-react'
import type { PromptDTO } from '@shared/types'

interface PromptContextMenuProps {
  open: boolean
  x: number
  y: number
  prompt: PromptDTO | null
  onClose: () => void
  onEdit: (prompt: PromptDTO) => void
  onCopy: (prompt: PromptDTO) => void
  onDuplicate: (prompt: PromptDTO) => void
  onTogglePinned: (prompt: PromptDTO) => void
  onToggleFavorite: (prompt: PromptDTO) => void
  onShare: (prompt: PromptDTO) => void
  onRefine: (prompt: PromptDTO) => void
  onAddAsTemplate: (prompt: PromptDTO) => void
  onDelete: (prompt: PromptDTO) => void
}

interface MenuAction {
  key: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  danger?: boolean
  action: () => void
}

export function PromptContextMenu({
  open,
  x,
  y,
  prompt,
  onClose,
  onEdit,
  onCopy,
  onDuplicate,
  onTogglePinned,
  onToggleFavorite,
  onShare,
  onRefine,
  onAddAsTemplate,
  onDelete
}: PromptContextMenuProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = () => onClose()
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open, onClose])

  const position = useMemo(() => {
    const menuWidth = 238
    const menuHeight = 390
    const maxX = Math.max(8, window.innerWidth - menuWidth - 8)
    const maxY = Math.max(8, window.innerHeight - menuHeight - 8)

    return {
      left: Math.min(x, maxX),
      top: Math.min(y, maxY)
    }
  }, [x, y])

  const actions = useMemo<MenuAction[]>(() => {
    if (!prompt) {
      return []
    }

    return [
      { key: 'edit', label: 'Edit Prompt', icon: Pencil, action: () => onEdit(prompt) },
      { key: 'copy', label: 'Copy Prompt', icon: Copy, action: () => onCopy(prompt) },
      { key: 'duplicate', label: 'Duplicate', icon: CopyPlus, action: () => onDuplicate(prompt) },
      {
        key: 'pin',
        label: prompt.pinned ? 'Unpin' : 'Pin',
        icon: Pin,
        action: () => onTogglePinned(prompt)
      },
      {
        key: 'favorite',
        label: prompt.favorite ? 'Remove Favorite' : 'Add Favorite',
        icon: Star,
        action: () => onToggleFavorite(prompt)
      },
      { key: 'share', label: 'Share / Export', icon: Share2, action: () => onShare(prompt) },
      { key: 'refine', label: 'Refine Prompt', icon: Sparkles, action: () => onRefine(prompt) },
      { key: 'template', label: 'Add as Template', icon: CopyPlus, action: () => onAddAsTemplate(prompt) },
      { key: 'delete', label: 'Delete Prompt', icon: Trash2, danger: true, action: () => onDelete(prompt) }
    ]
  }, [
    onAddAsTemplate,
    onCopy,
    onDelete,
    onDuplicate,
    onEdit,
    onRefine,
    onShare,
    onToggleFavorite,
    onTogglePinned,
    prompt
  ])

  if (!open || !prompt) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[70]"
      onContextMenu={(event) => event.preventDefault()}
      role="presentation"
    >
      <div
        className="absolute w-[238px] rounded-xl border border-line/20 bg-surface p-1.5 shadow-panel"
        style={position}
        onPointerDown={(event) => event.stopPropagation()}
        role="menu"
      >
        {actions.map((menuAction) => {
          const Icon = menuAction.icon
          return (
            <button
              key={menuAction.key}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                menuAction.danger ? 'text-danger hover:bg-danger/10' : 'text-text hover:bg-surface2'
              }`}
              onClick={() => {
                menuAction.action()
                onClose()
              }}
              role="menuitem"
              type="button"
            >
              <Icon size={14} className="shrink-0" />
              {menuAction.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
