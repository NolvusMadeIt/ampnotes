import { X } from 'lucide-react'

export interface AppToast {
  id: number
  message: string
  tone?: 'info' | 'success' | 'warning' | 'danger'
}

interface ToastHostProps {
  toasts: AppToast[]
  onClose: (id: number) => void
}

const toneStyles: Record<NonNullable<AppToast['tone']>, string> = {
  info: 'border-line/20 bg-surface text-text',
  success: 'border-success/20 bg-success/12 text-text',
  warning: 'border-warning/20 bg-warning/12 text-text',
  danger: 'border-danger/20 bg-danger/14 text-text'
}

export function ToastHost({ toasts, onClose }: ToastHostProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <aside className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(92vw,420px)] flex-col gap-2">
      {toasts.map((toast) => (
        <section
          key={toast.id}
          className={`pointer-events-auto relative overflow-hidden rounded-lg border px-4 py-3 shadow-panel ${toneStyles[toast.tone ?? 'info']} animate-[toastSlideIn_240ms_ease-out]`}
        >
          <button
            className="absolute right-2 top-2 rounded p-1 text-muted hover:bg-surface2 hover:text-text"
            onClick={() => onClose(toast.id)}
            type="button"
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
          <p className="pr-7 text-sm font-medium">{toast.message}</p>
        </section>
      ))}
    </aside>
  )
}
