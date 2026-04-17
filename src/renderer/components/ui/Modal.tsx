import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  widthClass?: string
}

export function Modal({ open, title, children, onClose, widthClass = 'max-w-4xl' }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-6">
      <div className={cn('w-full rounded-2xl border border-line/20 bg-surface shadow-panel', widthClass)}>
        <header className="flex items-center justify-between border-b border-line/20 px-5 py-4">
          <h2 className="editorial-heading text-2xl font-semibold">{title}</h2>
          <button className="text-muted hover:text-text" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="max-h-[80vh] overflow-y-auto p-5 scroll-y">{children}</div>
      </div>
    </div>
  )
}
