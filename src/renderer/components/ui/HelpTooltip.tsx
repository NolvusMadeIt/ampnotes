import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@renderer/lib/cn'

interface HelpTooltipProps {
  text: string
  className?: string
}

export function HelpTooltip({ text, className }: HelpTooltipProps) {
  const id = useId()
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const [tooltip, setTooltip] = useState<{
    open: boolean
    left: number
    top: number
    placement: 'top' | 'bottom'
  }>({
    open: false,
    left: 0,
    top: 0,
    placement: 'bottom'
  })

  const showTooltip = () => {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const placement = window.innerHeight - rect.bottom < 120 && rect.top > 120 ? 'top' : 'bottom'
    const left = Math.min(window.innerWidth - 120, Math.max(120, rect.left + rect.width / 2))
    const top = placement === 'bottom' ? rect.bottom + 8 : rect.top - 8
    setTooltip({ open: true, left, top, placement })
  }

  const hideTooltip = () => {
    setTooltip((current) => ({ ...current, open: false }))
  }

  return (
    <span className={cn('inline-flex items-center', className)}>
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-label="Help"
        aria-describedby={tooltip.open ? id : undefined}
        className="inline-flex h-4 min-w-4 cursor-help items-center justify-center px-0.5 text-[11px] font-semibold text-muted outline-none transition-colors hover:text-text focus:text-text"
        onBlur={hideTooltip}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        ?
      </span>
      {tooltip.open &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className={cn(
              'pointer-events-none fixed z-[9999] w-56 rounded-sm border border-line/20 bg-surface px-2 py-1.5 text-[11px] leading-4 text-text opacity-100 shadow-panel',
              tooltip.placement === 'top' ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'
            )}
            style={{
              left: tooltip.left,
              top: tooltip.top
            }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  )
}
