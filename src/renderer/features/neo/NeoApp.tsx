import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import ampLogoUrl from '@renderer/assets/imgs/amp_logo.png'
import {
  ArrowUpRight,
  ChevronRight,
  ChevronsUpDown,
  FilePlus2,
  Filter,
  Folder,
  FolderPlus,
  FolderOpen,
  Heart,
  Import,
  LayoutTemplate,
  Maximize2,
  Minus,
  PencilLine,
  Pin,
  Search,
  Settings2,
  Sparkles,
  Star,
  TerminalSquare,
  X
} from 'lucide-react'
import type { PromptDTO, TemplateDTO } from '@shared/types'
import { formatPromptValidationIssues, validatePromptForSave, validatePromptForShare } from '@shared/validation/prompt'
import { Button } from '@renderer/components/ui/Button'
import { GroqIcon } from '@renderer/components/ui/GroqIcon'
import { HelpTooltip } from '@renderer/components/ui/HelpTooltip'
import { TemplatePanel } from '@renderer/features/templates/TemplatePanel'

type NeoLane = 'all' | 'ready' | 'drafts' | 'favorites' | 'recent' | 'templates' | `folder:${string}`
type NeoFocus = 'browse' | 'read' | 'edit'

interface NeoAppProps {
  profileId: string
  profileName: string
  appVersion: string
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
  onOpenAbout: () => void
  onOpenTos: () => void
  onOpenMarketplace: () => void
  onCheckForUpdates: () => void
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
  folder: string
  useCase: string
  aiTarget: string
}

interface PromptContextMenuState {
  promptId: string
  x: number
  y: number
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

function navRowClass(active: boolean): string {
  return `inline-flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
    active ? 'bg-surface2 text-text' : 'text-muted hover:bg-surface2 hover:text-text'
  }`
}

function navSubRowClass(active: boolean): string {
  return `inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
    active ? 'bg-surface2 text-text' : 'text-muted hover:bg-surface2 hover:text-text'
  }`
}

function daysAgoLabel(value: string): string {
  const date = new Date(value)
  const time = date.getTime()
  if (!Number.isFinite(time)) {
    return ''
  }
  const oneDayMs = 24 * 60 * 60 * 1000
  const diffMs = Date.now() - time
  const days = Math.max(0, Math.floor(diffMs / oneDayMs))
  if (days === 0) {
    return 'today'
  }
  if (days === 1) {
    return '1d'
  }
  return `${days}d`
}

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
    return null
  }
  return window.localStorage.getItem(key)
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
    return
  }
  window.localStorage.setItem(key, value)
}

export function NeoApp({
  profileId,
  appVersion,
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
  onOpenAbout,
  onOpenTos,
  onOpenMarketplace,
  onCheckForUpdates,
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
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [projectsCollapsed, setProjectsCollapsed] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [draggedPromptId, setDraggedPromptId] = useState<string | null>(null)
  const [promptMenu, setPromptMenu] = useState<PromptContextMenuState | null>(null)
  const [tagFolderMap, setTagFolderMap] = useState<Record<string, string[]>>({})
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null)

  const folderStorageKey = `ampnotes.neo.custom-folders.v1:${profileId}`
  const folderCollapseStorageKey = `ampnotes.neo.folder-collapse.v1:${profileId}`
  const projectsCollapsedStorageKey = `ampnotes.neo.projects-collapsed.v1:${profileId}`
  const tagFolderStorageKey = `ampnotes.neo.tag-folders.v1:${profileId}`

  useEffect(() => {
    setHydratedStorageKey(null)
    try {
      const rawCustom = readLocalStorage(folderStorageKey)
      if (rawCustom) {
        const parsed = JSON.parse(rawCustom) as unknown
        if (Array.isArray(parsed)) {
          setCustomFolders(
            Array.from(
              new Set(
                parsed
                  .filter((item): item is string => typeof item === 'string')
                  .map((item) => item.trim())
                  .filter(Boolean)
              )
            ).sort((a, b) => a.localeCompare(b))
          )
        } else {
          setCustomFolders([])
        }
      } else {
        setCustomFolders([])
      }
    } catch {
      setCustomFolders([])
    }

    try {
      const rawCollapse = readLocalStorage(folderCollapseStorageKey)
      if (rawCollapse) {
        const parsed = JSON.parse(rawCollapse) as unknown
        if (parsed && typeof parsed === 'object') {
          const next: Record<string, boolean> = {}
          for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            next[key] = Boolean(value)
          }
          setCollapsedFolders(next)
        } else {
          setCollapsedFolders({})
        }
      } else {
        setCollapsedFolders({})
      }
    } catch {
      setCollapsedFolders({})
    }

    const rawProjectsCollapsed = readLocalStorage(projectsCollapsedStorageKey)
    setProjectsCollapsed(rawProjectsCollapsed === '1')

    try {
      const rawTagFolders = readLocalStorage(tagFolderStorageKey)
      if (rawTagFolders) {
        const parsed = JSON.parse(rawTagFolders) as unknown
        if (parsed && typeof parsed === 'object') {
          const next: Record<string, string[]> = {}
          for (const [folder, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (!Array.isArray(value)) {
              continue
            }
            const normalizedFolder = folder.trim()
            const normalizedTags = Array.from(
              new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))
            )
            if (normalizedFolder && normalizedTags.length > 0) {
              next[normalizedFolder] = normalizedTags
            }
          }
          setTagFolderMap(next)
        } else {
          setTagFolderMap({})
        }
      } else {
        setTagFolderMap({})
      }
    } catch {
      setTagFolderMap({})
    }
    setHydratedStorageKey(profileId)
  }, [folderCollapseStorageKey, folderStorageKey, projectsCollapsedStorageKey, tagFolderStorageKey])

  useEffect(() => {
    if (hydratedStorageKey !== profileId) {
      return
    }
    writeLocalStorage(folderStorageKey, JSON.stringify(customFolders))
  }, [customFolders, folderStorageKey, hydratedStorageKey, profileId])

  useEffect(() => {
    if (hydratedStorageKey !== profileId) {
      return
    }
    writeLocalStorage(folderCollapseStorageKey, JSON.stringify(collapsedFolders))
  }, [collapsedFolders, folderCollapseStorageKey, hydratedStorageKey, profileId])

  useEffect(() => {
    if (hydratedStorageKey !== profileId) {
      return
    }
    writeLocalStorage(projectsCollapsedStorageKey, projectsCollapsed ? '1' : '0')
  }, [projectsCollapsed, projectsCollapsedStorageKey, hydratedStorageKey, profileId])

  useEffect(() => {
    if (hydratedStorageKey !== profileId) {
      return
    }
    writeLocalStorage(tagFolderStorageKey, JSON.stringify(tagFolderMap))
  }, [tagFolderMap, tagFolderStorageKey, hydratedStorageKey, profileId])

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

  const assignedTagNames = useMemo(() => {
    const assigned = new Set<string>()
    Object.values(tagFolderMap).forEach((folderTags) => {
      folderTags.forEach((tag) => assigned.add(tag))
    })
    return assigned
  }, [tagFolderMap])

  const looseTags = useMemo(() => tags.filter((tag) => !assignedTagNames.has(tag.name)), [assignedTagNames, tags])

  const lanePrompts = useMemo(() => {
    let base =
      lane === 'favorites'
        ? prompts.filter((item) => item.favorite)
        : lane === 'recent'
          ? sortedByRecentUse
          : lane === 'ready'
            ? prompts.filter((item) => qualityScore(item) >= 80)
            : lane === 'drafts'
              ? prompts.filter((item) => qualityScore(item) < 80)
              : lane.startsWith('folder:')
                ? prompts.filter((item) => {
                    const folderName = lane.slice(7)
                    const folderTags = tagFolderMap[folderName] ?? []
                    return item.folder === folderName || item.tags.some((tag) => folderTags.includes(tag))
                  })
                : lane === 'all'
                  ? prompts
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
  }, [activeTag, lane, prompts, search, sortedByRecentUse, tagFolderMap])

  const folders = useMemo(() => {
    const folderSet = new Set<string>()
    customFolders.forEach((folder) => folderSet.add(folder))
    Object.keys(tagFolderMap).forEach((folder) => folderSet.add(folder))
    prompts.forEach((p) => {
      if (p.folder?.trim()) {
        folderSet.add(p.folder.trim())
      }
    })
    return Array.from(folderSet).sort()
  }, [customFolders, prompts, tagFolderMap])

  const folderGroups = useMemo(
    () => {
      const filterNeedle = projectSearch.trim().toLowerCase()
      const grouped = folders.map((folder) => {
        const folderTags = (tagFolderMap[folder] ?? []).filter((tagName) => tags.some((tag) => tag.name === tagName))
        const folderPrompts = prompts
          .filter((item) => item.folder?.trim() === folder || item.tags.some((tag) => folderTags.includes(tag)))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        const latestUpdatedAt = folderPrompts[0]?.updatedAt ?? null
        return {
          name: folder,
          tags: folderTags,
          prompts: folderPrompts,
          latestUpdatedAt
        }
      })

      if (!filterNeedle) {
        return grouped
      }

      return grouped.filter((group) => {
        if (group.name.toLowerCase().includes(filterNeedle)) {
          return true
        }
        if (group.tags.some((tag) => tag.toLowerCase().includes(filterNeedle))) {
          return true
        }
        return group.prompts.some((item) => item.title.toLowerCase().includes(filterNeedle))
      })
    },
    [folders, prompts, projectSearch, tagFolderMap, tags]
  )

  useEffect(() => {
    if (!lane.startsWith('folder:')) {
      return
    }
    const activeFolder = lane.slice(7)
    if (!folders.includes(activeFolder)) {
      setLane('all')
    }
  }, [folders, lane])

  useEffect(() => {
    if (lane === 'templates') {
      setFocus('browse')
    }
  }, [lane])

  const readyCount = prompts.filter((item) => qualityScore(item) >= 80).length
  const draftCount = prompts.length - readyCount
  const totalPromptCount = prompts.length
  const allFoldersCollapsed = folderGroups.length > 0 && folderGroups.every((group) => collapsedFolders[group.name])

  const contextPrompt = useMemo(
    () => (promptMenu ? prompts.find((item) => item.id === promptMenu.promptId) ?? null : null),
    [promptMenu, prompts]
  )

  useEffect(() => {
    if (!promptMenu) {
      return
    }

    const closeMenu = () => setPromptMenu(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('contextmenu', closeMenu)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('contextmenu', closeMenu)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [promptMenu])

  async function movePromptToFolder(promptId: string, folderName: string): Promise<void> {
    const prompt = prompts.find((item) => item.id === promptId)
    if (!prompt) {
      return
    }
    await onSavePrompt(prompt, {
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      folder: folderName,
      useCase: prompt.useCase,
      aiTarget: prompt.aiTarget
    })
    setLane(`folder:${folderName}`)
    onSelectPromptId(prompt.id)
    setFocus('read')
  }

  function moveTagToFolder(tagName: string, folderName: string): void {
    const normalizedTag = tagName.trim()
    const normalizedFolder = folderName.trim()
    if (!normalizedTag || !normalizedFolder) {
      return
    }

    setTagFolderMap((prev) => {
      const next: Record<string, string[]> = {}
      const folderNames = Array.from(new Set([...Object.keys(prev), normalizedFolder]))
      folderNames.forEach((folder) => {
        const folderTags = (prev[folder] ?? []).filter((tag) => tag !== normalizedTag)
        if (folder === normalizedFolder && !folderTags.includes(normalizedTag)) {
          folderTags.push(normalizedTag)
        }
        if (folderTags.length > 0) {
          next[folder] = folderTags
        }
      })
      return next
    })
  }

  return (
    <div className="neo-root flex h-full min-h-0 flex-col bg-bg">
      <header
        className="flex h-11 shrink-0 items-center justify-between border-b border-line/20 bg-surface px-3"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        <div className="flex min-w-0 items-center gap-3">
          <img src={ampLogoUrl} alt="AMP" className="h-6 w-6 object-contain" />
          <span className="mono-meta text-xs uppercase tracking-[0.16em] text-muted">AMP</span>
        </div>
        <div className="ml-auto flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
          <nav className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 px-2 text-sm text-muted transition-colors hover:bg-surface2 hover:text-text" onClick={onOpenShareImport}>
              <Import size={14} className="text-iconMuted" />
              Share / Import
            </button>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 px-2 text-sm text-muted transition-colors hover:bg-surface2 hover:text-text" onClick={onOpenMarketplace}>
              <ArrowUpRight size={14} className="text-iconMuted" />
              Marketplace
            </button>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 px-2 text-sm text-muted transition-colors hover:bg-surface2 hover:text-text" onClick={onCheckForUpdates}>
              <ChevronsUpDown size={14} className="text-iconMuted" />
              Check updates
            </button>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 px-2 text-sm text-muted transition-colors hover:bg-surface2 hover:text-text" onClick={onOpenSettings}>
              <Settings2 size={14} className="text-iconMuted" />
              Settings
            </button>
          </nav>
          <div className="flex items-center">
          <button
            type="button"
            className="grid h-8 w-10 place-items-center text-iconMuted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Minimize window"
            onClick={() => void window.api?.window.minimize()}
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            className="grid h-8 w-10 place-items-center text-iconMuted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Maximize or restore window"
            onClick={() => void window.api?.window.toggleMaximize()}
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            className="grid h-8 w-10 place-items-center text-iconMuted transition-colors hover:bg-danger/20 hover:text-danger"
            aria-label="Close window"
            onClick={() => void window.api?.window.close()}
          >
            <X size={15} />
          </button>
          </div>
        </div>
      </header>
      <main className="grid min-h-0 flex-1 gap-3 p-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="neo-panel flex min-h-0 flex-col overflow-hidden border border-line/20 bg-surface">
          <div className="border-b border-line/20 px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={ampLogoUrl} alt="AMP Logo" className="w-12" />
              
              <div>
                <p className="mono-meta text-xs uppercase tracking-[0.22em] text-muted">AMP</p>
                <h1 className="editorial-heading truncate text-[1.5rem] font-semibold leading-tight text-text">All My Prompts</h1>
              </div>
            </div>
            <button
              type="button"
              className={`${navRowClass(false)} mt-4 border border-line/20 bg-surface2 font-medium`}
              onClick={onCreatePrompt}
            >
              <FilePlus2 size={14} />
              New Prompt
            </button>
          </div>

          <div className="scroll-y min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div>
              <p className="mono-meta mb-1 px-2 text-[10px] uppercase tracking-[0.18em] text-muted">Workspace</p>
              <div className="space-y-0.5">
                <button type="button" className={navRowClass(lane === 'all')} onClick={() => setLane('all')}>
                  <FolderOpen size={14} />
                  <span className="truncate">All prompts</span>
                  <span className="ml-auto text-xs text-muted">{totalPromptCount}</span>
                </button>
                <button type="button" className={navRowClass(lane === 'ready')} onClick={() => setLane('ready')}>
                  <Star size={14} />
                  <span className="truncate">Ready</span>
                  <span className="ml-auto text-xs text-muted">{readyCount}</span>
                </button>
                <button type="button" className={navRowClass(lane === 'drafts')} onClick={() => setLane('drafts')}>
                  <PencilLine size={14} />
                  <span className="truncate">Drafting</span>
                  <span className="ml-auto text-xs text-muted">{draftCount}</span>
                </button>
                <button type="button" className={navRowClass(lane === 'favorites')} onClick={() => setLane('favorites')}>
                  <Heart size={14} />
                  <span className="truncate">Favorites</span>
                </button>
                <button type="button" className={navRowClass(lane === 'recent')} onClick={() => setLane('recent')}>
                  <TerminalSquare size={14} />
                  <span className="truncate">Recently used</span>
                </button>
                <button type="button" className={navRowClass(lane === 'templates')} onClick={() => setLane('templates')}>
                  <LayoutTemplate size={14} />
                  <span className="truncate">Templates</span>
                  <span className="ml-auto text-xs text-muted">{templates.length}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-line/20 pt-4">
              <div className="mb-1 flex items-center justify-between gap-2 px-2">
                <p className="mono-meta text-[10px] uppercase tracking-[0.18em] text-muted">Tags</p>
                <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-text"
                      title={projectsCollapsed ? 'Expand tags' : 'Collapse tags'}
                      onClick={() => setProjectsCollapsed((prev) => !prev)}
                    >
                      <ChevronsUpDown size={13} />
                    </button>
                    <button
                      type="button"
                      className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                        showProjectFilter ? 'bg-surface2 text-text' : 'text-muted hover:bg-surface2 hover:text-text'
                      }`}
                      title="Filter tag folders"
                      onClick={() => {
                        setShowProjectFilter((prev) => !prev)
                        if (showProjectFilter) {
                          setProjectSearch('')
                        }
                      }}
                    >
                      <Filter size={13} />
                    </button>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-text"
                      title="Create tag folder"
                      onClick={() => {
                        setIsCreatingFolder(true)
                        setProjectsCollapsed(false)
                      }}
                    >
                      <FolderPlus size={13} />
                    </button>
                  </div>
                </div>
                {showProjectFilter && (
                  <div className="mb-2 px-2">
                    <div className="flex items-center gap-2 rounded-md border border-line/20 bg-surface2 px-2">
                      <Filter size={12} className="text-muted" />
                      <input
                        value={projectSearch}
                        onChange={(event) => setProjectSearch(event.target.value)}
                        placeholder="Filter tags..."
                        className="h-8 w-full border-none bg-transparent text-xs outline-none"
                      />
                      {projectSearch.trim().length > 0 && (
                        <button
                          type="button"
                          className="grid h-5 w-5 place-items-center rounded text-muted transition-colors hover:bg-surface hover:text-text"
                          onClick={() => setProjectSearch('')}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {isCreatingFolder && (
                  <div className="mb-2 space-y-2 px-2">
                    <input
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      placeholder="Tag folder name"
                      className="h-8 w-full rounded-md border border-line/20 bg-surface2 px-2 text-xs outline-none focus:border-accent/30"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          const normalized = newFolderName.trim()
                          if (!normalized) return
                          if (!folders.includes(normalized)) {
                            setCustomFolders((prev) => [...prev, normalized].sort((a, b) => a.localeCompare(b)))
                          }
                          setLane(`folder:${normalized}`)
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }
                        if (event.key === 'Escape') {
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 rounded-md border border-line/20 bg-surface2 px-2 text-xs font-medium text-text transition-colors hover:border-accent/30"
                        onClick={() => {
                          const normalized = newFolderName.trim()
                          if (!normalized) return
                          if (!folders.includes(normalized)) {
                            setCustomFolders((prev) => [...prev, normalized].sort((a, b) => a.localeCompare(b)))
                          }
                          setLane(`folder:${normalized}`)
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }}
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        className="h-7 rounded-md px-2 text-xs text-muted transition-colors hover:bg-surface2 hover:text-text"
                        onClick={() => {
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {folderGroups.length === 0 && !isCreatingFolder && (
                    <p className="px-2 py-1 text-[11px] text-muted">No tag folders yet. Click the + icon to create one.</p>
                  )}
                  {folderGroups.map((group) => (
                    <div
                      key={group.name}
                      onDragEnter={(event) => {
                        event.preventDefault()
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'copy'
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        const dropTag = event.dataTransfer.getData('text/ampnotes-tag')
                        if (dropTag) {
                          moveTagToFolder(dropTag, group.name)
                          setCollapsedFolders((prev) => ({ ...prev, [group.name]: false }))
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-text"
                          title={collapsedFolders[group.name] || projectsCollapsed ? 'Expand folder' : 'Collapse folder'}
                          onClick={() =>
                            setCollapsedFolders((prev) => ({
                              ...prev,
                              [group.name]: !(prev[group.name] ?? false)
                            }))
                          }
                        >
                          <ChevronRight
                            size={12}
                            className={collapsedFolders[group.name] || projectsCollapsed ? '' : 'rotate-90'}
                          />
                        </button>
                        <button
                          type="button"
                          className={navRowClass(lane === `folder:${group.name}`)}
                          onClick={() => setLane(`folder:${group.name}`)}
                          onDragEnter={(event) => {
                            event.preventDefault()
                          }}
                          onDragOver={(event) => {
                            event.preventDefault()
                            event.dataTransfer.dropEffect = 'copy'
                          }}
                          onDrop={(event) => {
                            event.preventDefault()
                            const dropTag = event.dataTransfer.getData('text/ampnotes-tag')
                            if (dropTag) {
                              moveTagToFolder(dropTag, group.name)
                              setCollapsedFolders((prev) => ({ ...prev, [group.name]: false }))
                              return
                            }
                            const dropPromptId = event.dataTransfer.getData('text/ampnotes-prompt-id') || draggedPromptId
                            if (!dropPromptId) {
                              return
                            }
                            void movePromptToFolder(dropPromptId, group.name)
                            setDraggedPromptId(null)
                          }}
                        >
                          <Folder size={14} />
                          <span className="truncate">{group.name}</span>
                          <span className="ml-auto text-xs text-muted">
                            {group.tags.length}
                          </span>
                        </button>
                      </div>
                      {!projectsCollapsed && !collapsedFolders[group.name] && (
                        <div className="mt-0.5 space-y-0.5 pl-7">
                          {group.tags.length === 0 ? (
                            <p className="px-2 py-1 text-[11px] text-muted">No tags yet</p>
                          ) : (
                            group.tags.map((tagName) => {
                              const tag = tags.find((item) => item.name === tagName)
                              return (
                              <button
                                key={`${group.name}-${tagName}`}
                                type="button"
                                className={navSubRowClass(activeTag === tagName)}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'copy'
                                  event.dataTransfer.setData('text/ampnotes-tag', tagName)
                                }}
                                onClick={() => {
                                  setLane(`folder:${group.name}`)
                                  onSelectTag(tagName)
                                }}
                              >
                                <span className="truncate">#{tagName}</span>
                                <span className="ml-auto text-[11px] text-muted">{tag?.count ?? 0}</span>
                              </button>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-0.5">
                {looseTags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    className={navRowClass(activeTag === tag.name)}
                    onClick={() => onSelectTag(tag.name)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'copy'
                      event.dataTransfer.setData('text/ampnotes-tag', tag.name)
                    }}
                  >
                    <span className="truncate">#{tag.name}</span>
                    <span className="ml-auto text-xs text-muted">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </aside>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(360px,0.95fr)_minmax(620px,1.35fr)]">
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
                      draggable
                      onClick={() => {
                        onSelectPromptId(prompt.id)
                        setFocus('read')
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        onSelectPromptId(prompt.id)
                        setPromptMenu({
                          promptId: prompt.id,
                          x: event.clientX,
                          y: event.clientY
                        })
                      }}
                      onDragStart={(event) => {
                        setDraggedPromptId(prompt.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/ampnotes-prompt-id', prompt.id)
                      }}
                      onDragEnd={() => {
                        setDraggedPromptId(null)
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
                          <span
                            key={`${prompt.id}-${tag}`}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = 'copy'
                              event.dataTransfer.setData('text/ampnotes-tag', tag)
                            }}
                            className="rounded-md border border-line/20 bg-surface px-1.5 py-0.5 text-[11px] text-muted"
                          >
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
                folders={folders}
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
        </div>
      </main>
      <footer className="flex h-8 shrink-0 items-center bg-surface px-4 text-xs text-muted">
        <span>© 2026 AMP</span>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" className="transition-colors hover:text-text" onClick={onOpenAbout}>
            About
          </button>
          <button type="button" className="transition-colors hover:text-text" onClick={onOpenTos}>
            ToS
          </button>
          <span className="mono-meta">v{appVersion}</span>
        </div>
      </footer>

      {promptMenu && contextPrompt && (
        <div
          className="fixed z-[120] min-w-[220px] border border-line/30 bg-surface p-1 shadow-2xl"
          style={{ left: promptMenu.x, top: promptMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              onSelectPromptId(contextPrompt.id)
              setFocus('read')
              setPromptMenu(null)
            }}
          >
            Open
          </button>
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              onSelectPromptId(contextPrompt.id)
              setFocus('edit')
              setPromptMenu(null)
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              void onCopyPrompt(contextPrompt)
              setPromptMenu(null)
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              onRefinePrompt(contextPrompt)
              setPromptMenu(null)
            }}
          >
            Improve
          </button>
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              void onValidatePrompt(contextPrompt)
              setPromptMenu(null)
            }}
          >
            Validate Prompt
          </button>
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              onSharePrompt(contextPrompt)
              setPromptMenu(null)
            }}
          >
            Share / Export
          </button>
          <button
            type="button"
            className={navSubRowClass(false)}
            onClick={() => {
              void onAddAsTemplate(contextPrompt)
              setPromptMenu(null)
            }}
          >
            Add as Template
          </button>

          <div className="my-1 border-t border-line/20" />
          <p className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted">Add To Tag Folder</p>
          {folders.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted">No folders yet</p>
          ) : (
            folders.map((folder) => (
              <button
                key={`menu-folder-${folder}`}
                type="button"
                className={navSubRowClass(contextPrompt.folder === folder)}
                onClick={() => {
                  void movePromptToFolder(contextPrompt.id, folder)
                  setPromptMenu(null)
                }}
              >
                {folder}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface NeoFocusPanelProps {
  prompt: PromptDTO
  focus: NeoFocus
  setFocus: (mode: NeoFocus) => void
  folders: string[]
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
  folders,
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
    folder: '',
    useCase: '',
    aiTarget: ''
  })

  useEffect(() => {
    setForm({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      folder: prompt.folder ?? '',
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
                <span className="mb-1 block font-medium">
                  Category
                  <HelpTooltip text="Type of prompt: Writer, Coding, Analysis, Productivity, etc." />
                </span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Tags
                  <HelpTooltip text="Labels to organize and find your prompt later. Comma separated." />
                </span>
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
                <span className="mb-1 block font-medium">
                  Folder
                  <HelpTooltip text="Organize prompts into folders. Create new folders from the sidebar." />
                </span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.folder}
                  onChange={(event) => setForm((prev) => ({ ...prev, folder: event.target.value }))}
                  placeholder="e.g. Work, Personal, Project X"
                  list="folder-suggestions"
                />
                <datalist id="folder-suggestions">
                  {folders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Use case
                  <HelpTooltip text="What is this prompt used for? Example: Writing weekly reports, debugging code, summarizing meetings." />
                </span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.useCase}
                  onChange={(event) => setForm((prev) => ({ ...prev, useCase: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  AI target
                  <HelpTooltip text="Which AI model is this prompt designed for? Example: ChatGPT, Claude, Gemini, Grok." />
                </span>
                <input
                  className="h-10 w-full border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/25"
                  value={form.aiTarget}
                  onChange={(event) => setForm((prev) => ({ ...prev, aiTarget: event.target.value }))}
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Prompt content (Markdown)
                <HelpTooltip text="The actual prompt text. Include instructions, format guidance, constraints, and examples to get the best output." />
              </span>
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
                folder: form.folder.trim() || undefined,
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
