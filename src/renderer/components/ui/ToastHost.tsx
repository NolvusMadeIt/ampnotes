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
  info: 'border-[color:var(--toast-border)] bg-[color:var(--toast-bg)] text-[color:var(--toast-text)]',
  success:
    'border-success/55 bg-[color:var(--toast-bg)] text-[color:var(--toast-text)] shadow-[0_0_0_1px_rgba(30,138,102,0.16)]',
  warning:
    'border-warning/60 bg-[color:var(--toast-bg)] text-[color:var(--toast-text)] shadow-[0_0_0_1px_rgba(155,106,45,0.16)]',
  danger:
    'border-danger/60 bg-[color:var(--toast-bg)] text-[color:var(--toast-text)] shadow-[0_0_0_1px_rgba(165,72,66,0.16)]'
}

export function ToastHost({ toasts, onClose }: ToastHostProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <aside className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[min(92vw,480px)] flex-col gap-3">
      {toasts.map((toast) => (
        <section
          key={toast.id}
          className={`pointer-events-auto relative overflow-hidden rounded-xl border px-5 py-4 shadow-panel ${toneStyles[toast.tone ?? 'info']} animate-[toastSlideIn_240ms_ease-out]`}
        >
          <button
            className="absolute right-3 top-3 rounded p-1 opacity-75 transition hover:opacity-100"
            style={{ color: 'var(--toast-muted)' }}
            onClick={() => onClose(toast.id)}
            type="button"
            aria-label="Close notification"
          >
            <X size={17} />
          </button>
          <p className="pr-8 text-base font-semibold leading-relaxed">{toast.message}</p>
        </section>
      ))}
    </aside>
  )
}
