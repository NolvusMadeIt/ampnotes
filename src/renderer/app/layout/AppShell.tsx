import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface AppShellProps {
  sidebarCollapsed?: boolean
  detailVisible?: boolean
  sidebar: ReactNode
  topbar: ReactNode
  content: ReactNode
  detail: ReactNode
  footer?: ReactNode
}

const SIDEBAR_EXPANDED_WIDTH = 250
const SIDEBAR_COLLAPSED_WIDTH = 86
const DEFAULT_LIST_WIDTH = 360
const MIN_LIST_WIDTH = 280
const MIN_DETAIL_WIDTH = 420
const LIST_WIDTH_STORAGE_KEY = 'ampnotes.layout.list.width'
const WIDE_LAYOUT_BREAKPOINT = 1536

export function AppShell({
  sidebarCollapsed = false,
  detailVisible = true,
  sidebar,
  topbar,
  content,
  detail,
  footer
}: AppShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isWideLayout, setIsWideLayout] = useState(false)
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LIST_WIDTH_STORAGE_KEY)
      if (!stored) {
        return
      }
      const parsed = Number(stored)
      if (Number.isFinite(parsed)) {
        setListWidth(Math.max(MIN_LIST_WIDTH, parsed))
      }
    } catch {
      // Ignore storage read issues.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(LIST_WIDTH_STORAGE_KEY, String(Math.round(listWidth)))
    } catch {
      // Ignore storage write issues.
    }
  }, [listWidth])

  useEffect(() => {
    const handleResize = () => {
      setIsWideLayout(window.innerWidth >= WIDE_LAYOUT_BREAKPOINT)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!draggingRef.current) {
        return
      }

      const shell = shellRef.current
      if (!shell) {
        return
      }

      const rect = shell.getBoundingClientRect()
      const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
      const available = rect.width - sidebarWidth
      const maxListWidth = Math.max(MIN_LIST_WIDTH, available - MIN_DETAIL_WIDTH)
      const nextWidth = event.clientX - rect.left - sidebarWidth
      const clamped = Math.min(maxListWidth, Math.max(MIN_LIST_WIDTH, nextWidth))
      setListWidth(clamped)
    }

    const handleUp = () => {
      if (!draggingRef.current) {
        return
      }
      draggingRef.current = false
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [sidebarCollapsed])

  const gridClassName = useMemo(
    () =>
      `grid h-full grid-cols-1 ${
        sidebarCollapsed ? 'lg:grid-cols-[86px_1fr]' : 'lg:grid-cols-[250px_1fr]'
      } ${detailVisible ? '2xl:grid-cols-[auto_auto_1fr]' : ''}`,
    [detailVisible, sidebarCollapsed]
  )

  const gridStyle = useMemo(() => {
    if (!detailVisible || !isWideLayout) {
      return undefined
    }
    const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
    return {
      gridTemplateColumns: `${sidebarWidth}px ${listWidth}px minmax(${MIN_DETAIL_WIDTH}px, 1fr)`
    }
  }, [detailVisible, isWideLayout, listWidth, sidebarCollapsed])

  return (
    <div className="grid h-full min-h-0 grid-rows-[1fr_auto]">
      <div ref={shellRef} className={`${gridClassName} min-h-0`} style={gridStyle}>
        <aside className="border-b border-line/20 bg-surface/95 p-3 sm:p-4 lg:border-b-0 lg:border-r">{sidebar}</aside>
        <section className="relative flex min-h-0 flex-col border-b border-line/20 bg-surface/80 lg:border-b-0 2xl:border-r">
          <header className="border-b border-line/20 px-3 py-3 sm:px-4">{topbar}</header>
          <main className="scroll-y min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{content}</main>
          {detailVisible && (
            <div className="border-t border-line/20 bg-surface px-3 py-3 sm:px-4 sm:py-4 2xl:hidden">{detail}</div>
          )}
          {detailVisible && (
            <button
              type="button"
              aria-label="Resize list and editor columns"
              className="absolute right-0 top-0 hidden h-full w-3 translate-x-1/2 cursor-col-resize 2xl:block"
              onMouseDown={(event) => {
                event.preventDefault()
                draggingRef.current = true
                setIsDragging(true)
                document.body.style.cursor = 'col-resize'
                document.body.style.userSelect = 'none'
              }}
            >
              <span className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 ${isDragging ? 'bg-accent' : 'bg-border'}`} />
            </button>
          )}
        </section>
        {detailVisible && <section className="hidden min-h-0 bg-surface/90 p-4 2xl:block">{detail}</section>}
      </div>
      {footer && <footer className="bg-surface/95 px-3 py-2 sm:px-4">{footer}</footer>}
    </div>
  )
}
