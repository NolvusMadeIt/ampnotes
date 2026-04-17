import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FilePlus2,
  Heart,
  Import,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Puzzle,
  Search as SearchIcon,
  Settings,
  Tag,
  Timer,
  WandSparkles
} from 'lucide-react'
import { AuthView } from '@renderer/features/auth/AuthView'
import { AppShell } from '@renderer/app/layout/AppShell'
import { SearchInput } from '@renderer/features/search/SearchInput'
import { PromptCard } from '@renderer/components/prompt/PromptCard'
import { PromptContextMenu } from '@renderer/components/prompt/PromptContextMenu'
import { PromptEditor } from '@renderer/features/prompts/PromptEditor'
import { PromptHomeFeed } from '@renderer/features/prompts/PromptHomeFeed'
import { PromptReader } from '@renderer/features/prompts/PromptReader'
import { AboutPage } from '@renderer/features/legal/AboutPage'
import { TermsOfServicePage } from '@renderer/features/legal/TermsOfServicePage'
import { NewPromptModal } from '@renderer/features/prompts/NewPromptModal'
import { usePromptUiStore, type NavSection } from '@renderer/features/prompts/usePromptUiStore'
import { TagList } from '@renderer/features/tags/TagList'
import { TemplatePanel } from '@renderer/features/templates/TemplatePanel'
import { SettingsDialog } from '@renderer/features/settings/SettingsDialog'
import { RefineModal } from '@renderer/features/refine/RefineModal'
import { ShareDialog } from '@renderer/features/sharing/ShareDialog'
import { Button } from '@renderer/components/ui/Button'
import { getApi, hasDesktopBridge } from '@renderer/lib/api-client'
import { applyAppearance, applyTheme, resolveTheme } from '@renderer/lib/theme'
import { ToastHost, type AppToast } from '@renderer/components/ui/ToastHost'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import {
  formatPromptValidationIssues,
  validatePromptForSave,
  validatePromptForShare
} from '@shared/validation/prompt'
import type {
  AppearanceSettingsDTO,
  CreatePluginManifestInput,
  CreateThemeManifestInput,
  MarketplaceStateDTO,
  ProfileDTO,
  PromptDTO,
  RefinementResult,
  SessionDTO,
  TemplateDTO,
  ThemeMode
} from '@shared/types'

const NAV_ITEMS: Array<{
  id: NavSection
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}> = [
  { id: 'all', label: 'All Pages', icon: LayoutGrid },
  { id: 'favorites', label: 'Starred', icon: Heart },
  { id: 'recent', label: 'Recent', icon: Timer },
  { id: 'templates', label: 'Templates', icon: WandSparkles },
  { id: 'pluginSettings', label: 'Plugins', icon: Puzzle },
  { id: 'themeSettings', label: 'Themes', icon: Palette }
]

const EMPTY_MARKETPLACE_STATE: MarketplaceStateDTO = {
  plugins: [],
  themes: [],
  activeThemeId: null
}

const DEFAULT_APPEARANCE: AppearanceSettingsDTO = {
  fontFamily: 'merriweather',
  fontScale: 100,
  themePreset: 'midnight'
}

const SETTINGS_SECTIONS: NavSection[] = ['settings', 'pluginSettings', 'themeSettings']

export default function Routes() {
  const api = useMemo(() => getApi(), [])
  const [profiles, setProfiles] = useState<ProfileDTO[]>([])
  const [profile, setProfile] = useState<ProfileDTO | null>(null)
  const [session, setSession] = useState<SessionDTO | null>(null)
  const [theme, setTheme] = useState<ThemeMode>('system')
  const [appearance, setAppearance] = useState<AppearanceSettingsDTO>(DEFAULT_APPEARANCE)
  const [marketplaceState, setMarketplaceState] = useState<MarketplaceStateDTO>(EMPTY_MARKETPLACE_STATE)
  const [prompts, setPrompts] = useState<PromptDTO[]>([])
  const [templates, setTemplates] = useState<TemplateDTO[]>([])
  const [tags, setTags] = useState<Array<{ name: string; count: number }>>([])
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [toasts, setToasts] = useState<AppToast[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const nav = usePromptUiStore((state) => state.nav)
  const search = usePromptUiStore((state) => state.search)
  const activeTag = usePromptUiStore((state) => state.activeTag)
  const selectedPromptId = usePromptUiStore((state) => state.selectedPromptId)
  const setNav = usePromptUiStore((state) => state.setNav)
  const setSearch = usePromptUiStore((state) => state.setSearch)
  const setActiveTag = usePromptUiStore((state) => state.setActiveTag)
  const setSelectedPromptId = usePromptUiStore((state) => state.setSelectedPromptId)

  const [refineOpen, setRefineOpen] = useState(false)
  const [promptDetailMode, setPromptDetailMode] = useState<'home' | 'read' | 'edit'>('home')
  const [shareOpen, setShareOpen] = useState(false)
  const [newPromptOpen, setNewPromptOpen] = useState(false)
  const [newPromptRefineConfigured, setNewPromptRefineConfigured] = useState(false)
  const [newPromptRefining, setNewPromptRefining] = useState(false)
  const [groqKeyConfigured, setGroqKeyConfigured] = useState(false)
  const [draggingPromptId, setDraggingPromptId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    prompt: PromptDTO
  } | null>(null)

  const [refineConfigured, setRefineConfigured] = useState(false)
  const [refineLoading, setRefineLoading] = useState(false)
  const [refineResult, setRefineResult] = useState<RefinementResult | null>(null)
  const [validatingPromptId, setValidatingPromptId] = useState<string | null>(null)

  const [shareCode, setShareCode] = useState('')
  const toastTimersRef = useRef<Map<number, number>>(new Map())
  const toastCounterRef = useRef(1)
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    tone: 'default' | 'danger'
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    tone: 'default'
  })
  const isSettingsNav = SETTINGS_SECTIONS.includes(nav)
  const isLegalNav = nav === 'about' || nav === 'tos'
  const activeNavLabel = useMemo(() => {
    if (nav === 'about') {
      return 'About'
    }
    if (nav === 'tos') {
      return 'Terms of Service'
    }
    if (nav === 'settings') {
      return 'Settings'
    }
    if (nav === 'all' && activeTag) {
      return `Tagged #${activeTag}`
    }
    return NAV_ITEMS.find((item) => item.id === nav)?.label ?? 'All Pages'
  }, [activeTag, nav])

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId]
  )
  const detailVisible = useMemo(
    () =>
      !isSettingsNav &&
      nav !== 'templates' &&
      !isLegalNav &&
      selectedPrompt !== null,
    [isLegalNav, isSettingsNav, nav, selectedPrompt]
  )
  const favoriteCount = useMemo(() => prompts.filter((item) => item.favorite).length, [prompts])
  const latestUpdated = useMemo(() => {
    if (prompts.length === 0) {
      return null
    }
    return [...prompts]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
      .updatedAt
  }, [prompts])
  const activeMarketplaceTheme = useMemo(
    () => marketplaceState.themes.find((themeItem) => themeItem.id === marketplaceState.activeThemeId) ?? null,
    [marketplaceState]
  )
  const enabledPluginIds = useMemo(
    () => marketplaceState.plugins.filter((plugin) => plugin.enabled).map((plugin) => plugin.id),
    [marketplaceState.plugins]
  )
  const isBrowserMode = useMemo(() => !hasDesktopBridge(), [])
  const canReorderPrompts = nav === 'all' && !activeTag && search.trim().length === 0 && prompts.length > 1

  useEffect(() => {
    applyAppearance(appearance, resolveTheme(theme))
    applyTheme(theme, activeMarketplaceTheme?.tokens)
  }, [activeMarketplaceTheme?.tokens, appearance, theme])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('ampnotes.sidebar.collapsed')
      if (raw === 'true') {
        setSidebarCollapsed(true)
      }
    } catch {
      // ignore storage read issues
    }
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    const timer = toastTimersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      toastTimersRef.current.delete(id)
    }
  }, [])

  const flashToast = useCallback((message: string, tone: AppToast['tone'] = 'info') => {
    const id = toastCounterRef.current++
    setToasts((prev) => [...prev, { id, message, tone }].slice(-4))
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
      toastTimersRef.current.delete(id)
    }, 8000)
    toastTimersRef.current.set(id, timer)
  }, [])

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
      toastTimersRef.current.clear()
    }
  }, [])

  const requestConfirm = useCallback(
    (options: { title: string; message: string; confirmLabel?: string; tone?: 'default' | 'danger' }) =>
      new Promise<boolean>((resolve) => {
        confirmResolverRef.current = resolve
        setConfirmDialog({
          open: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Confirm',
          tone: options.tone ?? 'default'
        })
      }),
    []
  )

  const resolveConfirm = useCallback((value: boolean) => {
    const resolver = confirmResolverRef.current
    confirmResolverRef.current = null
    setConfirmDialog((prev) => ({ ...prev, open: false }))
    if (resolver) {
      resolver(value)
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem('ampnotes.sidebar.collapsed', String(next))
      } catch {
        // ignore storage write issues
      }
      return next
    })
  }, [])

  const openStaticPage = useCallback(
    (section: 'about' | 'tos') => {
      setContextMenu(null)
      setActiveTag(null)
      setNav(section)
      setSelectedPromptId(null)
      setPromptDetailMode('home')
    },
    [setActiveTag, setNav, setSelectedPromptId]
  )

  const handleSelectNav = useCallback(
    (section: NavSection) => {
      setContextMenu(null)
      setActiveTag(null)
      setNav(section)
      setSelectedPromptId(null)

      if (
        section === 'all' ||
        section === 'templates' ||
        section === 'settings' ||
        section === 'pluginSettings' ||
        section === 'themeSettings'
      ) {
        setPromptDetailMode('home')
        return
      }

      setPromptDetailMode('read')
    },
    [setActiveTag, setNav, setSelectedPromptId]
  )

  const handleSelectTag = useCallback(
    (tagName: string | null) => {
      setContextMenu(null)
      setSearch('')
      setActiveTag(tagName)
      setNav('all')
      setSelectedPromptId(null)
      setPromptDetailMode('home')
    },
    [setActiveTag, setNav, setSearch, setSelectedPromptId]
  )

  const refreshAuth = useCallback(async () => {
    const [profileList, active] = await Promise.all([api.profile.list(), api.profile.getSession()])
    setProfiles(profileList)
    if (active) {
      setProfile(active.profile)
      setSession(active.session)
      const [savedTheme, savedAppearance] = await Promise.all([
        api.settings.getTheme(active.profile.id),
        api.settings.getAppearance(active.profile.id)
      ])
      setTheme(savedTheme)
      setAppearance(savedAppearance)
    } else {
      setProfile(null)
      setSession(null)
      setMarketplaceState(EMPTY_MARKETPLACE_STATE)
      setAppearance(DEFAULT_APPEARANCE)
    }
  }, [api.profile, api.settings])

  const refreshWorkspace = useCallback(async () => {
    if (!profile) {
      return
    }

    const [tagRows, categoryRows, templateRows, marketplace] = await Promise.all([
      api.tag.list(profile.id),
      api.prompt.categories(profile.id),
      api.template.list(),
      api.marketplace.getState(profile.id)
    ])
    setTags(tagRows)
    setCategories(categoryRows)
    setTemplates(templateRows)
    setMarketplaceState(marketplace)

    if (nav === 'templates' || SETTINGS_SECTIONS.includes(nav) || nav === 'about' || nav === 'tos') {
      setPrompts([])
      setSelectedPromptId(null)
      setPromptDetailMode('home')
      return
    }

    let rows: PromptDTO[]
    if (nav === 'recent') {
      rows = await api.prompt.recent(profile.id, 40)
    } else if (search.trim()) {
      rows = await api.search.query(profile.id, search, {
        favorite: nav === 'favorites' ? true : undefined,
        pinned: nav === 'pinned' ? true : undefined,
        tag: activeTag ?? undefined,
        limit: 200,
        offset: 0
      })
    } else {
      rows = await api.prompt.list(profile.id, {
        favorite: nav === 'favorites' ? true : undefined,
        pinned: nav === 'pinned' ? true : undefined,
        tag: activeTag ?? undefined,
        limit: 200,
        offset: 0
      })
    }

    setPrompts(rows)
    if (rows.length === 0) {
      setSelectedPromptId(null)
      setPromptDetailMode(nav === 'all' ? 'home' : 'read')
      return
    }

    const hasSelected = selectedPromptId ? rows.some((item) => item.id === selectedPromptId) : false
    if (!hasSelected) {
      // Keep home in 3-column notebook mode by selecting first row for the feed context.
      setSelectedPromptId(rows[0].id)
      setPromptDetailMode(nav === 'all' ? 'home' : 'read')
    }
  }, [activeTag, api.marketplace, api.prompt, api.tag, api.template, nav, profile, search, selectedPromptId, setSelectedPromptId])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  useEffect(() => {
    if (!newPromptOpen || !profile) {
      return
    }

    setContextMenu(null)
    void api.refine.isConfigured(profile.id).then(setNewPromptRefineConfigured).catch(() => {
      setNewPromptRefineConfigured(false)
    })
  }, [api.refine, newPromptOpen, profile])

  useEffect(() => {
    if (!profile) {
      setGroqKeyConfigured(false)
      return
    }

    let active = true
    void api.refine
      .isConfigured(profile.id)
      .then((configured) => {
        if (active) {
          setGroqKeyConfigured(configured)
        }
      })
      .catch(() => {
        if (active) {
          setGroqKeyConfigured(false)
        }
      })

    return () => {
      active = false
    }
  }, [api.refine, profile])

  const handleCreateAndSignIn = useCallback(async (displayName: string) => {
    const result = await api.profile.createAndSignIn(displayName)
    setProfile(result.profile)
    setSession(result.session)
    setProfiles((prev) => [...prev, result.profile])
    const [savedTheme, savedAppearance] = await Promise.all([
      api.settings.getTheme(result.profile.id),
      api.settings.getAppearance(result.profile.id)
    ])
    setTheme(savedTheme)
    setAppearance(savedAppearance)
  }, [api.settings])

  const handleSignIn = useCallback(async (profileId: string) => {
    const result = await api.profile.signIn(profileId)
    setProfile(result.profile)
    setSession(result.session)
    const [savedTheme, savedAppearance] = await Promise.all([
      api.settings.getTheme(result.profile.id),
      api.settings.getAppearance(result.profile.id)
    ])
    setTheme(savedTheme)
    setAppearance(savedAppearance)
    flashToast(`Welcome back, ${result.profile.displayName}`)
  }, [api.settings, flashToast])

  const handleCopy = useCallback(
    async (prompt: PromptDTO) => {
      await navigator.clipboard.writeText(prompt.content)
      await api.prompt.markUsed(prompt.profileId, prompt.id)
      await refreshWorkspace()
      flashToast('Prompt copied to clipboard')
    },
    [flashToast, refreshWorkspace]
  )

  const handleCreatePrompt = useCallback(async () => {
    setContextMenu(null)
    setNewPromptOpen(true)
  }, [])

  const handleCreatePromptFromDraft = useCallback(async (input: {
    title: string
    content: string
    category?: string
    tags?: string[]
    useCase?: string
    aiTarget?: string
  }) => {
    if (!profile) {
      return
    }
    const issues = validatePromptForSave(input)
    if (issues.length > 0) {
      flashToast(formatPromptValidationIssues(issues))
      return
    }

    try {
      const created = await api.prompt.create(profile.id, input)

      setActiveTag(null)
      setNav('all')
      await refreshWorkspace()
      setSelectedPromptId(created.id)
      setPromptDetailMode('home')
      setNewPromptOpen(false)
      flashToast('Prompt created')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create prompt'
      flashToast(message)
    }
  }, [flashToast, profile, refreshWorkspace, setActiveTag, setNav, setSelectedPromptId])

  const handleRefineDraft = useCallback(async (content: string) => {
    if (!profile) {
      throw new Error('Profile not available')
    }

    setNewPromptRefining(true)
    try {
      return await api.refine.prompt({
        profileId: profile.id,
        content,
        preserveIntent: true,
        goals: 'Improve clarity, structure, and output guidance while keeping intent.'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refinement failed'
      flashToast(message)
      throw error
    } finally {
      setNewPromptRefining(false)
    }
  }, [flashToast, profile])

  const handleSavePrompt = useCallback(
    async (prompt: PromptDTO, updates: Partial<PromptDTO> & { tags: string[] }) => {
      if (!profile) {
        return
      }
      const issues = validatePromptForSave({
        title: updates.title ?? prompt.title,
        content: updates.content ?? prompt.content
      })
      if (issues.length > 0) {
        flashToast(formatPromptValidationIssues(issues))
        return
      }

      await api.prompt.update(profile.id, {
        id: prompt.id,
        title: updates.title ?? prompt.title,
        content: updates.content ?? prompt.content,
        category: updates.category ?? prompt.category,
        tags: updates.tags,
        useCase: updates.useCase,
        aiTarget: updates.aiTarget,
        favorite: prompt.favorite,
        pinned: prompt.pinned
      })

      await refreshWorkspace()
      flashToast('Prompt saved')
    },
    [flashToast, profile, refreshWorkspace]
  )

  const handleDeletePrompt = useCallback(
    async (prompt: PromptDTO) => {
      if (!profile) {
        return
      }

      const approved = await requestConfirm({
        title: 'Delete Page?',
        message: `Delete "${prompt.title}" permanently?`,
        confirmLabel: 'Delete Page',
        tone: 'danger'
      })
      if (!approved) {
        return
      }

      await api.prompt.delete(profile.id, prompt.id)
      await refreshWorkspace()
      flashToast('Page deleted', 'warning')
    },
    [api.prompt, flashToast, profile, refreshWorkspace, requestConfirm]
  )

  const handleDuplicatePrompt = useCallback(
    async (prompt: PromptDTO) => {
      if (!profile) {
        return
      }

      const duplicate = await api.prompt.create(profile.id, {
        title: `${prompt.title} (Copy)`,
        content: prompt.content,
        category: prompt.category,
        tags: prompt.tags,
        useCase: prompt.useCase,
        aiTarget: prompt.aiTarget,
        favorite: false,
        pinned: false
      })

      await refreshWorkspace()
      setSelectedPromptId(duplicate.id)
      setPromptDetailMode(nav === 'all' ? 'home' : 'read')
      flashToast('Prompt duplicated')
    },
    [flashToast, nav, profile, refreshWorkspace, setSelectedPromptId]
  )

  const handleReorderPrompts = useCallback(
    async (draggedId: string, targetId: string) => {
      if (!profile || draggedId === targetId || !canReorderPrompts) {
        return
      }

      const draggedIndex = prompts.findIndex((prompt) => prompt.id === draggedId)
      const targetIndex = prompts.findIndex((prompt) => prompt.id === targetId)
      if (draggedIndex < 0 || targetIndex < 0) {
        return
      }

      const nextPrompts = [...prompts]
      const [draggedPrompt] = nextPrompts.splice(draggedIndex, 1)
      nextPrompts.splice(targetIndex, 0, draggedPrompt)
      setPrompts(nextPrompts)

      try {
        const reordered = await api.prompt.reorder(profile.id, nextPrompts.map((prompt) => prompt.id))
        setPrompts(reordered)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not reorder prompts'
        flashToast(message, 'warning')
        await refreshWorkspace()
      }
    },
    [api.prompt, canReorderPrompts, flashToast, profile, prompts, refreshWorkspace]
  )

  const handleUseTemplate = useCallback(
    async (template: TemplateDTO) => {
      if (!profile) {
        return
      }

      const created = await api.prompt.create(profile.id, {
        title: template.title,
        content: template.content,
        category: template.category ?? 'General',
        tags: template.tags
      })

      setActiveTag(null)
      setNav('all')
      await refreshWorkspace()
      setSelectedPromptId(created.id)
      setPromptDetailMode('home')
      flashToast('Template added as prompt')
    },
    [flashToast, profile, refreshWorkspace, setActiveTag, setNav, setSelectedPromptId]
  )

  const handleAddPromptAsTemplate = useCallback(
    async (prompt: PromptDTO) => {
      await api.template.create({
        title: prompt.title,
        content: prompt.content,
        category: prompt.category,
        tags: prompt.tags
      })
      await refreshWorkspace()
      flashToast('Prompt added as template')
    },
    [api.template, flashToast, refreshWorkspace]
  )

  const handleCreateTemplate = useCallback(
    async (input: { title: string; content: string; category?: string; tags?: string[] }) => {
      await api.template.create(input)
      await refreshWorkspace()
      flashToast('Template created')
    },
    [api.template, flashToast, refreshWorkspace]
  )

  const handleUpdateTemplate = useCallback(
    async (input: { id: string; title: string; content: string; category?: string; tags?: string[] }) => {
      await api.template.update(input)
      await refreshWorkspace()
      flashToast('Template updated')
    },
    [api.template, flashToast, refreshWorkspace]
  )

  const handleDeleteTemplate = useCallback(
    async (template: TemplateDTO) => {
      const approved = await requestConfirm({
        title: 'Delete Template?',
        message: `Delete template "${template.title}" permanently?`,
        confirmLabel: 'Delete Template',
        tone: 'danger'
      })
      if (!approved) {
        return
      }
      await api.template.delete(template.id)
      await refreshWorkspace()
      flashToast('Template deleted', 'warning')
    },
    [api.template, flashToast, refreshWorkspace, requestConfirm]
  )

  const handleOpenRefine = useCallback(
    async (prompt: PromptDTO) => {
      if (!profile) {
        return
      }

      const configured = await api.refine.isConfigured(profile.id)
      setRefineConfigured(configured)
      setRefineResult(null)
      setSelectedPromptId(prompt.id)
      setRefineOpen(true)
    },
    [profile]
  )

  const handleValidatePrompt = useCallback(
    async (prompt: PromptDTO) => {
      if (!profile) {
        return
      }
      const configured = await api.refine.isConfigured(profile.id)
      if (!configured) {
        flashToast('Set your Groq API key in Settings before validation.')
        setNav('settings')
        return
      }

      setValidatingPromptId(prompt.id)
      try {
        await api.prompt.validateWithGroq(profile.id, prompt.id)
        await refreshWorkspace()
        flashToast('Prompt validated with Groq')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Validation failed'
        flashToast(message)
      } finally {
        setValidatingPromptId(null)
      }
    },
    [api.prompt, api.refine, flashToast, profile, refreshWorkspace, setNav]
  )

  const handleRunRefine = useCallback(
    async (goals: string, preserveIntent: boolean) => {
      if (!profile || !selectedPrompt) {
        return
      }

      setRefineLoading(true)
      try {
        const result = await api.refine.prompt({
          profileId: profile.id,
          promptId: selectedPrompt.id,
          content: selectedPrompt.content,
          goals,
          preserveIntent,
          targetTool: selectedPrompt.aiTarget
        })
        setRefineResult(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Refinement failed'
        flashToast(message)
      } finally {
        setRefineLoading(false)
      }
    },
    [flashToast, profile, selectedPrompt]
  )

  const handleApplyRefine = useCallback(
    async (mode: 'replace' | 'variant') => {
      if (!profile || !selectedPrompt || !refineResult) {
        return
      }

      await api.prompt.applyRefinement({
        profileId: profile.id,
        promptId: selectedPrompt.id,
        refinedContent: refineResult.refinedContent,
        mode,
        provider: refineResult.providerId,
        model: refineResult.model,
        notes: refineResult.notes
      })

      await refreshWorkspace()
      setRefineOpen(false)
      setRefineResult(null)
      flashToast(mode === 'replace' ? 'Refined prompt applied' : 'Refined variant saved')
    },
    [flashToast, profile, refineResult, refreshWorkspace, selectedPrompt]
  )

  const handleGenerateShare = useCallback(async (promptId: string) => {
    const sharePrompt = prompts.find((item) => item.id === promptId)
    if (!sharePrompt) {
      flashToast('Select a prompt first')
      return
    }
    const issues = validatePromptForShare(sharePrompt)
    if (issues.length > 0) {
      flashToast(formatPromptValidationIssues(issues))
      return
    }

    const generated = await api.share.generateCode(promptId)
    setShareCode(generated.encoded)
    await navigator.clipboard.writeText(generated.encoded)
    flashToast('Share code copied')
  }, [flashToast, prompts])

  const handleExportShare = useCallback(
    async (promptId: string, format: 'json' | 'txt') => {
      if (!profile) {
        return
      }
      const sharePrompt = prompts.find((item) => item.id === promptId)
      if (!sharePrompt) {
        flashToast('Select a prompt first')
        return
      }
      const issues = validatePromptForShare(sharePrompt)
      if (issues.length > 0) {
        flashToast(formatPromptValidationIssues(issues))
        return
      }

      await api.share.exportPrompt(profile.id, promptId, format)
      flashToast(`Prompt exported as ${format.toUpperCase()}`)
    },
    [flashToast, profile, prompts]
  )

  const handleExportSelected = useCallback(
    async (selection: { promptIds: string[]; templateIds: string[] }) => {
      if (!profile) {
        return
      }
      try {
        const result = await api.share.exportSelected(profile.id, selection)
        if (result.ok) {
          flashToast('Selected items exported')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed'
        flashToast(message)
      }
    },
    [api.share, flashToast, profile]
  )

  const handleImportCode = useCallback(
    async (encoded: string) => {
      if (!profile) {
        return
      }

      const result = await api.share.importCode(profile.id, encoded, 'import_copy')
      if (result.imported) {
        await refreshWorkspace()
        flashToast('Prompt imported from share code')
      } else {
        flashToast(result.reason ?? 'Import skipped')
      }
    },
    [flashToast, profile, refreshWorkspace]
  )

  const handleImportFile = useCallback(async () => {
    if (!profile) {
      return
    }

    const result = await api.share.importFile(profile.id)
    if (result.imported) {
      await refreshWorkspace()
      flashToast('Prompt imported from file')
    }
  }, [flashToast, profile, refreshWorkspace])

  const handleRegisterPlugin = useCallback(
    async (manifest: CreatePluginManifestInput) => {
      if (!profile) {
        return
      }
      await api.marketplace.registerPlugin(profile.id, manifest)
      await refreshWorkspace()
      flashToast('Plugin registered')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleTogglePlugin = useCallback(
    async (pluginId: string, enabled: boolean) => {
      if (!profile) {
        return
      }
      await api.marketplace.setPluginEnabled(profile.id, pluginId, enabled)
      await refreshWorkspace()
      flashToast(enabled ? 'Plugin enabled' : 'Plugin disabled')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleRemovePlugin = useCallback(
    async (pluginId: string) => {
      if (!profile) {
        return
      }
      await api.marketplace.removePlugin(profile.id, pluginId)
      await refreshWorkspace()
      flashToast('Plugin removed')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleOpenPluginFolder = useCallback(
    async (pluginId: string) => {
      if (!profile) {
        return { ok: false, reason: 'Profile not available' }
      }
      return api.marketplace.openPluginFolder(profile.id, pluginId)
    },
    [api.marketplace, profile]
  )

  const handleRegisterTheme = useCallback(
    async (manifest: CreateThemeManifestInput) => {
      if (!profile) {
        return
      }
      await api.marketplace.registerTheme(profile.id, manifest)
      await refreshWorkspace()
      flashToast('Theme registered')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleSetActiveTheme = useCallback(
    async (themeId: string | null) => {
      if (!profile) {
        return
      }
      await api.marketplace.setActiveTheme(profile.id, themeId)
      await refreshWorkspace()
      flashToast(themeId ? 'Marketplace theme activated' : 'Marketplace theme cleared')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleRemoveTheme = useCallback(
    async (themeId: string) => {
      if (!profile) {
        return
      }
      await api.marketplace.removeTheme(profile.id, themeId)
      await refreshWorkspace()
      flashToast('Theme removed')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleOpenThemeFolder = useCallback(
    async (themeId: string) => {
      if (!profile) {
        return { ok: false, reason: 'Profile not available' }
      }
      return api.marketplace.openThemeFolder(profile.id, themeId)
    },
    [api.marketplace, profile]
  )

  if (!profile || !session) {
    return (
      <AuthView
        profiles={profiles}
        onCreateAndSignIn={handleCreateAndSignIn}
        onSignIn={handleSignIn}
      />
    )
  }

  return (
    <>
      <AppShell
        sidebarCollapsed={sidebarCollapsed}
        detailVisible={detailVisible}
        sidebar={
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              {!sidebarCollapsed && (
                <div>
                  <p className="editorial-heading mt-1 text-[1.85rem] font-semibold leading-tight">AMP</p>
                  <p className="text-sm text-muted">All My Prompts</p>
                </div>
              )}
              <Button size="sm" variant="ghost" type="button" onClick={toggleSidebar}>
                {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={16} />}
              </Button>
            </div>

            <Button
              variant="primary"
              className={
                sidebarCollapsed
                  ? 'border-transparent shadow-none hover:border-transparent'
                  : 'justify-start text-left border-transparent shadow-none hover:border-transparent'
              }
              onClick={handleCreatePrompt}
            >
              <FilePlus2 size={sidebarCollapsed ? 19 : 15} className={sidebarCollapsed ? '' : 'mr-2'} />
              {!sidebarCollapsed && 'New Page'}
            </Button>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActiveNav = nav === item.id && !(item.id === 'all' && activeTag)
                return (
                  <button
                    key={item.id}
                    className={`inline-flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActiveNav ? 'bg-surface2 text-text' : 'text-muted hover:bg-surface2'
                    }`}
                    onClick={() => handleSelectNav(item.id)}
                    title={item.label}
                  >
                    <Icon size={sidebarCollapsed ? 19 : 14} className={sidebarCollapsed ? '' : 'mr-2'} />
                    {!sidebarCollapsed && item.label}
                  </button>
                )
              })}
            </nav>

            {!sidebarCollapsed && (
              <div className="space-y-4">
                <div className="border-t border-line/20 pt-4">
                  <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                    <Tag size={12} />
                    Tags
                  </p>
                  <TagList
                    tags={tags}
                    activeTag={activeTag}
                    allTagsActive={nav === 'all' && activeTag === null}
                    onSelectTag={handleSelectTag}
                  />
                </div>
              </div>
            )}

            <div className="mt-auto grid gap-2">
              <Button
                variant="secondary"
                className={
                  sidebarCollapsed
                    ? 'border-line/20 bg-accent/10 hover:border-line/20 hover:bg-accent/15'
                    : 'w-full [justify-content:flex-start] text-left border-line/20 bg-accent/10 hover:border-line/20 hover:bg-accent/15'
                }
                onClick={() => {
                  setContextMenu(null)
                  setShareOpen(true)
                }}
                title="Share / Import"
              >
                <Import size={sidebarCollapsed ? 19 : 15} className={sidebarCollapsed ? '' : 'mr-2 shrink-0'} />
                {!sidebarCollapsed && 'Share / Import'}
              </Button>
              <Button
                variant="secondary"
                className={
                  sidebarCollapsed
                    ? 'border-line/20 hover:border-line/20'
                    : 'w-full [justify-content:flex-start] text-left border-line/20 hover:border-line/20'
                }
                onClick={() => {
                  handleSelectNav('settings')
                }}
                title="Settings"
              >
                <Settings size={sidebarCollapsed ? 19 : 15} className={sidebarCollapsed ? '' : 'mr-2 shrink-0'} />
                {!sidebarCollapsed && 'Settings'}
              </Button>
            </div>
          </div>
        }
        topbar={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!isSettingsNav && !isLegalNav && (
              <>
                <div className="inline-flex items-center gap-2 rounded-lg border border-line/20 bg-surface2 px-2.5 py-1.5 text-muted">
                  <SearchIcon size={14} />
                </div>
                <div className="min-w-0 flex-[1_1_200px] sm:flex-[1_1_260px]">
                  <SearchInput value={search} onChange={setSearch} />
                </div>
                <span className="mono-meta rounded-md border border-line/20 bg-surface2 px-3 py-1 text-xs uppercase tracking-wide text-muted">
                  {nav === 'templates' ? `${templates.length} templates` : `${prompts.length} pages`}
                </span>
                {isBrowserMode && (
                  <span className="mono-meta rounded-md border border-success/20 bg-success/10 px-3 py-1 text-xs uppercase tracking-wide text-success">
                    Browser Mode
                  </span>
                )}
              </>
            )}
            {(isSettingsNav || isLegalNav) && (
              <h2 className="editorial-heading text-2xl font-semibold">{activeNavLabel}</h2>
            )}
          </div>
        }
        content={
          isSettingsNav ? (
            <SettingsDialog
              asPage
              section={nav === 'pluginSettings' ? 'plugins' : nav === 'themeSettings' ? 'themes' : 'general'}
              currentTheme={theme}
              appearance={appearance}
              marketplaceState={marketplaceState}
              onThemeChange={async (nextTheme) => {
                setTheme(nextTheme)
                await api.settings.setTheme(profile.id, nextTheme)
              }}
              onAppearanceChange={async (nextAppearance) => {
                setAppearance(nextAppearance)
                await api.settings.setAppearance(profile.id, nextAppearance)
              }}
              onRegisterPlugin={handleRegisterPlugin}
              onTogglePlugin={handleTogglePlugin}
              onRemovePlugin={handleRemovePlugin}
              onOpenPluginFolder={handleOpenPluginFolder}
              onRegisterTheme={handleRegisterTheme}
              onSetActiveMarketplaceTheme={handleSetActiveTheme}
              onRemoveTheme={handleRemoveTheme}
              onOpenThemeFolder={handleOpenThemeFolder}
              onSaveGroqKey={async (apiKey) => {
                await api.refine.saveApiKey(profile.id, apiKey)
                setGroqKeyConfigured(true)
                flashToast('Groq API key saved')
              }}
              onClearGroqKey={async () => {
                await api.refine.clearApiKey(profile.id)
                setGroqKeyConfigured(false)
                flashToast('Groq API key cleared')
              }}
              isGroqKeyConfigured={groqKeyConfigured}
              onSignOut={async () => {
                await api.profile.signOut()
                await refreshAuth()
              }}
            />
          ) : nav === 'templates' ? (
            <TemplatePanel
              templates={templates}
              onUseTemplate={handleUseTemplate}
              onCreateTemplate={handleCreateTemplate}
              onUpdateTemplate={handleUpdateTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          ) : nav === 'about' ? (
            <AboutPage />
          ) : nav === 'tos' ? (
            <TermsOfServicePage />
          ) : (
            <div className="grid h-full min-h-0 content-start gap-3">
              <div className="flex items-center justify-between gap-2 border-b border-line/20 pb-2">
                <div>
                  <p className="mono-meta text-xs uppercase tracking-[0.2em] text-muted">Section</p>
                  <p className="text-sm font-semibold text-text">{activeNavLabel}</p>
                </div>
                {nav === 'all' && latestUpdated && (
                  <p className="mono-meta text-xs uppercase tracking-wide text-muted">
                    Last Updated {new Date(latestUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>

              {nav === 'all' && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-line/20 bg-surface px-3 py-2">
                    <p className="mono-meta text-[10px] uppercase tracking-wide text-muted">Total Pages</p>
                    <p className="text-lg font-semibold">{prompts.length}</p>
                  </div>
                  <div className="rounded-lg border border-line/20 bg-surface px-3 py-2">
                    <p className="mono-meta text-[10px] uppercase tracking-wide text-muted">Starred</p>
                    <p className="text-lg font-semibold">{favoriteCount}</p>
                  </div>
                  <div className="rounded-lg border border-line/20 bg-surface px-3 py-2">
                    <p className="mono-meta text-[10px] uppercase tracking-wide text-muted">Templates</p>
                    <p className="text-lg font-semibold">{templates.length}</p>
                  </div>
                </div>
              )}

              {prompts.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-line/20 bg-surface p-10 text-center">
                  <h2 className="editorial-heading text-3xl font-semibold">No pages here yet</h2>
                  <p className="mt-2 max-w-sm text-sm text-muted">
                    Create a page or import one. Your editable prompt will appear in the right pane.
                  </p>
                </div>
              ) : (
                <div className="scroll-y min-h-0 space-y-3 overflow-y-auto rounded-xl border border-line/20 bg-surface p-3">
                  {prompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      prompt={prompt}
                      selected={selectedPromptId === prompt.id}
                      isTemplateCopy={templates.some(
                        (template) => template.title === prompt.title && template.content === prompt.content
                      )}
                      reorderEnabled={canReorderPrompts}
                      dragging={draggingPromptId === prompt.id}
                      onSelect={() => {
                        setSelectedPromptId(prompt.id)
                        setPromptDetailMode(nav === 'all' ? 'home' : 'read')
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setSelectedPromptId(prompt.id)
                        setPromptDetailMode(nav === 'all' ? 'home' : 'read')
                        setContextMenu({
                          x: event.clientX,
                          y: event.clientY,
                          prompt
                        })
                      }}
                      onDragStart={(event) => {
                        if (!canReorderPrompts) {
                          return
                        }
                        event.stopPropagation()
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', prompt.id)
                        setDraggingPromptId(prompt.id)
                      }}
                      onDragOver={(event) => {
                        if (!canReorderPrompts || !draggingPromptId || draggingPromptId === prompt.id) {
                          return
                        }
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                      }}
                      onDrop={(event) => {
                        if (!canReorderPrompts) {
                          return
                        }
                        event.preventDefault()
                        event.stopPropagation()
                        const draggedId = event.dataTransfer.getData('text/plain') || draggingPromptId
                        setDraggingPromptId(null)
                        if (draggedId) {
                          void handleReorderPrompts(draggedId, prompt.id)
                        }
                      }}
                      onDragEnd={() => setDraggingPromptId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        }
        detail={
          nav === 'all' && promptDetailMode === 'home' ? (
            <PromptHomeFeed
              prompts={prompts}
              onReadPrompt={(prompt) => {
                setSelectedPromptId(prompt.id)
                setPromptDetailMode('read')
              }}
              onUsePrompt={(prompt) => {
                setSelectedPromptId(prompt.id)
                setPromptDetailMode('edit')
              }}
              onImprovePrompt={(prompt) => {
                void handleOpenRefine(prompt)
              }}
            />
          ) : promptDetailMode === 'read' ? (
            <PromptReader
              prompt={selectedPrompt}
              onUsePrompt={(prompt) => {
                setSelectedPromptId(prompt.id)
                setPromptDetailMode('edit')
              }}
              onImprovePrompt={(prompt) => {
                void handleOpenRefine(prompt)
              }}
            />
          ) : (
            <PromptEditor
              prompt={selectedPrompt}
              categorySuggestions={categories.map((item) => item.name)}
              tagSuggestions={tags.map((item) => item.name)}
              onSave={handleSavePrompt}
              onDelete={handleDeletePrompt}
              onRefine={handleOpenRefine}
              onValidate={handleValidatePrompt}
              onShare={(prompt) => {
                setSelectedPromptId(prompt.id)
                setShareOpen(true)
              }}
              onAddAsTemplate={handleAddPromptAsTemplate}
              isValidating={selectedPrompt ? validatingPromptId === selectedPrompt.id : false}
              enabledPluginIds={enabledPluginIds}
            />
          )
        }
        footer={
          <div className="grid w-full items-center gap-2 text-sm text-muted sm:grid-cols-[1fr_auto_1fr]">
            <span className="hidden sm:block" />
            <p className="text-center">© {new Date().getFullYear()} AMP</p>
            <div className="flex items-center justify-center gap-3 sm:justify-self-end">
              <button
                type="button"
                className="font-medium text-muted transition-colors hover:text-text"
                onClick={() => openStaticPage('about')}
              >
                About
              </button>
              <span aria-hidden className="text-border">
                |
              </span>
              <button
                type="button"
                className="font-medium text-muted transition-colors hover:text-text"
                onClick={() => openStaticPage('tos')}
              >
                ToS
              </button>
            </div>
          </div>
        }
      />

      <NewPromptModal
        open={newPromptOpen}
        isRefineConfigured={newPromptRefineConfigured}
        isRefining={newPromptRefining}
        categorySuggestions={categories.map((item) => item.name)}
        tagSuggestions={tags.map((item) => item.name)}
        onClose={() => {
          setContextMenu(null)
          setNewPromptOpen(false)
        }}
        onConfigureRefine={() => {
          setNewPromptOpen(false)
          handleSelectNav('settings')
          flashToast('Add your Groq API key, then run Improve Draft.')
        }}
        onCreate={handleCreatePromptFromDraft}
        onRefine={handleRefineDraft}
      />

      <PromptContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        prompt={contextMenu?.prompt ?? null}
        onClose={() => setContextMenu(null)}
        onEdit={(prompt) => {
          setSelectedPromptId(prompt.id)
          setPromptDetailMode('edit')
          setNav('all')
          flashToast('Prompt opened in editor')
        }}
        onCopy={async (prompt) => {
          await handleCopy(prompt)
        }}
        onDuplicate={async (prompt) => {
          await handleDuplicatePrompt(prompt)
        }}
        onTogglePinned={async (prompt) => {
          await api.prompt.togglePinned(profile.id, prompt.id)
          await refreshWorkspace()
        }}
        onToggleFavorite={async (prompt) => {
          await api.prompt.toggleFavorite(profile.id, prompt.id)
          await refreshWorkspace()
        }}
        onShare={(prompt) => {
          setSelectedPromptId(prompt.id)
          setShareOpen(true)
        }}
        onRefine={(prompt) => {
          void handleOpenRefine(prompt)
        }}
        onAddAsTemplate={async (prompt) => {
          await handleAddPromptAsTemplate(prompt)
        }}
        onDelete={async (prompt) => {
          await handleDeletePrompt(prompt)
        }}
      />

      <RefineModal
        open={refineOpen}
        prompt={selectedPrompt}
        configured={refineConfigured}
        isLoading={refineLoading}
        result={refineResult}
        onClose={() => {
          setRefineOpen(false)
          setRefineResult(null)
        }}
        onRun={handleRunRefine}
        onApply={handleApplyRefine}
      />

      <ShareDialog
        open={shareOpen}
        prompt={selectedPrompt}
        prompts={prompts}
        templates={templates}
        shareCode={shareCode}
        onClose={() => {
          setShareOpen(false)
          setShareCode('')
        }}
        onGenerate={handleGenerateShare}
        onExport={handleExportShare}
        onExportSelected={handleExportSelected}
        onImportCode={handleImportCode}
        onImportFile={handleImportFile}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        tone={confirmDialog.tone}
        onCancel={() => resolveConfirm(false)}
        onConfirm={() => resolveConfirm(true)}
      />

      <ToastHost toasts={toasts} onClose={removeToast} />
    </>
  )
}
