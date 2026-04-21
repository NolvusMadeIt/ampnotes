import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthView } from '@renderer/features/auth/AuthView'
import { NeoApp } from '@renderer/features/neo/NeoApp'
import { AboutPage } from '@renderer/features/legal/AboutPage'
import { TermsOfServicePage } from '@renderer/features/legal/TermsOfServicePage'
import { NewPromptModal } from '@renderer/features/prompts/NewPromptModal'
import { SettingsDialog } from '@renderer/features/settings/SettingsDialog'
import { RefineModal } from '@renderer/features/refine/RefineModal'
import { ShareDialog } from '@renderer/features/sharing/ShareDialog'
import { ToastHost, type AppToast } from '@renderer/components/ui/ToastHost'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import { getApi } from '@renderer/lib/api-client'
import { applyAppearance, applyTheme, resolveTheme } from '@renderer/lib/theme'
import {
  formatPromptValidationIssues,
  validatePromptForSave,
  validatePromptForShare
} from '@shared/validation/prompt'
import type {
  AdminProfileDTO,
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

const EMPTY_MARKETPLACE_STATE: MarketplaceStateDTO = {
  plugins: [],
  themes: [],
  activeThemeId: null
}

const MARKETPLACE_URL = import.meta.env.VITE_AMP_MARKETPLACE_URL ?? 'http://localhost:4200/'

const DEFAULT_APPEARANCE: AppearanceSettingsDTO = {
  fontFamily: 'merriweather',
  fontScale: 100,
  themePreset: 'midnight'
}

const SESSION_TTL_MS = 48 * 60 * 60 * 1000
const DEFAULT_APP_VERSION = '0.1.2'

function buildMarketplaceUrl(
  theme: ThemeMode,
  appearance: AppearanceSettingsDTO,
  activeMarketplaceThemeId?: string
): string {
  try {
    const url = new URL(MARKETPLACE_URL)
    url.searchParams.set('embedded', '1')
    url.searchParams.set('ampTheme', resolveTheme(theme))
    url.searchParams.set('ampPreset', appearance.themePreset)
    if (activeMarketplaceThemeId) {
      url.searchParams.set('activeThemeId', activeMarketplaceThemeId)
    }
    return url.toString()
  } catch {
    return 'http://localhost:4200/?embedded=1'
  }
}

function AppFooter({
  version,
  onAbout,
  onTos
}: {
  version: string
  onAbout: () => void
  onTos: () => void
}) {
  return (
    <footer className="flex h-8 shrink-0 items-center bg-surface px-4 text-xs text-muted">
      <span>© 2026 AMP</span>
      <div className="ml-auto flex items-center gap-3">
        <button type="button" className="transition-colors hover:text-text" onClick={onAbout}>
          About
        </button>
        <button type="button" className="transition-colors hover:text-text" onClick={onTos}>
          ToS
        </button>
        <span className="mono-meta">v{version}</span>
      </div>
    </footer>
  )
}

function AppTopNav({
  title,
  onSettings,
  onMarketplace,
  onAbout,
  onTos,
  onCheckForUpdates,
  onClose
}: {
  title: string
  onSettings: () => void
  onMarketplace: () => void
  onAbout: () => void
  onTos: () => void
  onCheckForUpdates: () => void
  onClose?: () => void
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line/20 bg-surface px-4">
      <h2 className="editorial-heading truncate text-xl font-semibold">{title}</h2>
      <nav className="ml-auto flex items-center gap-2 text-sm">
        <button type="button" className="px-2 py-1 text-muted transition-colors hover:text-text" onClick={onMarketplace}>
          Marketplace
        </button>
        <button type="button" className="px-2 py-1 text-muted transition-colors hover:text-text" onClick={onSettings}>
          Settings
        </button>
        <button type="button" className="px-2 py-1 text-muted transition-colors hover:text-text" onClick={onAbout}>
          About
        </button>
        <button type="button" className="px-2 py-1 text-muted transition-colors hover:text-text" onClick={onTos}>
          ToS
        </button>
        <button type="button" className="px-2 py-1 text-muted transition-colors hover:text-text" onClick={onCheckForUpdates}>
          Updates
        </button>
        {onClose ? (
          <button type="button" className="px-2 py-1 text-muted transition-colors hover:text-text" onClick={onClose}>
            Close
          </button>
        ) : null}
      </nav>
    </header>
  )
}

export default function Routes() {
  const api = useMemo(() => getApi(), [])
  const [appVersion, setAppVersion] = useState(DEFAULT_APP_VERSION)
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
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<AppToast[]>([])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'general' | 'plugins' | 'themes' | 'admin' | 'all'>('all')
  const [legalPage, setLegalPage] = useState<'about' | 'tos' | null>(null)
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [marketplaceLoadKey, setMarketplaceLoadKey] = useState(0)
  const [marketplaceStatus, setMarketplaceStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const [refineOpen, setRefineOpen] = useState(false)
  const [refineConfigured, setRefineConfigured] = useState(false)
  const [refineLoading, setRefineLoading] = useState(false)
  const [refineResult, setRefineResult] = useState<RefinementResult | null>(null)
  const [validatingPromptId, setValidatingPromptId] = useState<string | null>(null)

  const [shareOpen, setShareOpen] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [newPromptOpen, setNewPromptOpen] = useState(false)
  const [newPromptRefineConfigured, setNewPromptRefineConfigured] = useState(false)
  const [newPromptRefining, setNewPromptRefining] = useState(false)
  const [groqKeyConfigured, setGroqKeyConfigured] = useState(false)
  const [adminProfile, setAdminProfile] = useState<AdminProfileDTO | null>(null)

  const toastTimersRef = useRef<Map<number, number>>(new Map())
  const sessionExpiryTimerRef = useRef<number | null>(null)
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

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId]
  )

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

  useEffect(() => {
    applyAppearance(appearance, resolveTheme(theme))
    applyTheme(theme, activeMarketplaceTheme?.tokens)
  }, [activeMarketplaceTheme?.tokens, appearance, theme])

  const marketplaceUrl = useMemo(() => {
    return buildMarketplaceUrl(theme, appearance, activeMarketplaceTheme?.id)
  }, [activeMarketplaceTheme?.id, appearance.themePreset, theme])

  const openMarketplace = useCallback(() => {
    setMarketplaceStatus('loading')
    setMarketplaceLoadKey((current) => current + 1)
    setMarketplaceOpen(true)
  }, [])

  const retryMarketplace = useCallback(() => {
    setMarketplaceStatus('loading')
    setMarketplaceLoadKey((current) => current + 1)
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

  const handleCheckForUpdates = useCallback(async () => {
    if (!api.app?.checkForUpdates) {
      flashToast(`AMP ${appVersion} is up to date.`)
      return
    }
    const result = await api.app.checkForUpdates()
    if (!result.ok) {
      flashToast(result.reason ?? 'Update check failed.', 'warning')
      return
    }
    if (result.updateAvailable) {
      flashToast(`AMP ${result.latestVersion ?? 'update'} is available. Open the releases page to download it.`, 'success')
      return
    }
    if (!result.updateAvailable) {
      flashToast(`AMP ${result.currentVersion} is up to date.`)
    }
  }, [api.app, appVersion, flashToast])

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
      toastTimersRef.current.clear()
      if (sessionExpiryTimerRef.current) {
        window.clearTimeout(sessionExpiryTimerRef.current)
        sessionExpiryTimerRef.current = null
      }
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

  const openSettings = useCallback((section: 'general' | 'plugins' | 'themes' | 'admin' | 'all') => {
    setSettingsSection(section)
    setSettingsOpen(true)
  }, [])

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
      if (api.settings.getAdminProfile) {
        const admin = await api.settings.getAdminProfile(active.profile.id)
        setAdminProfile(admin)
      } else {
        setAdminProfile(null)
      }
    } else {
      setProfile(null)
      setSession(null)
      setMarketplaceState(EMPTY_MARKETPLACE_STATE)
      setAppearance(DEFAULT_APPEARANCE)
      setAdminProfile(null)
    }
  }, [api.profile, api.settings])

  useEffect(() => {
    if (sessionExpiryTimerRef.current) {
      window.clearTimeout(sessionExpiryTimerRef.current)
      sessionExpiryTimerRef.current = null
    }

    if (!session) {
      return
    }

    const signedInAtMs = Date.parse(session.signedInAt)
    const remainingMs = Number.isFinite(signedInAtMs)
      ? signedInAtMs + SESSION_TTL_MS - Date.now()
      : 0

    const expireSession = async () => {
      await api.profile.signOut()
      flashToast('Session expired. Please sign in again.', 'warning')
      await refreshAuth()
    }

    if (remainingMs <= 0) {
      void expireSession()
      return
    }

    sessionExpiryTimerRef.current = window.setTimeout(() => {
      void expireSession()
    }, remainingMs)

    return () => {
      if (sessionExpiryTimerRef.current) {
        window.clearTimeout(sessionExpiryTimerRef.current)
        sessionExpiryTimerRef.current = null
      }
    }
  }, [api.profile, flashToast, refreshAuth, session])

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

    const rows = await api.prompt.list(profile.id, {
      tag: activeTag ?? undefined,
      limit: 200,
      offset: 0
    })

    setPrompts(rows)
    if (rows.length === 0) {
      setSelectedPromptId(null)
      return
    }

    const hasSelected = selectedPromptId ? rows.some((item) => item.id === selectedPromptId) : false
    if (!hasSelected) {
      setSelectedPromptId(rows[0].id)
    }
  }, [activeTag, api.marketplace, api.prompt, api.tag, api.template, profile, selectedPromptId])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  useEffect(() => {
    if (!api.app?.getInfo) {
      setAppVersion(DEFAULT_APP_VERSION)
      return
    }
    void api.app.getInfo().then((info) => setAppVersion(info.version)).catch(() => {
      setAppVersion(DEFAULT_APP_VERSION)
    })
  }, [api.app])

  useEffect(() => {
    void refreshWorkspace()
  }, [refreshWorkspace])

  useEffect(() => {
    if (!newPromptOpen || !profile) {
      return
    }
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

  useEffect(() => {
    if (!api.marketplace.onDeepLinkInstalled) {
      return undefined
    }

    return api.marketplace.onDeepLinkInstalled((event) => {
      void refreshWorkspace()
      if (event.kind === 'theme') {
        flashToast(`Installed "${event.name}" theme.`, 'success')
        if (profile) {
          void requestConfirm({
            title: 'Make this your active theme?',
            message: `Set "${event.name}" as your default AMP theme now?`,
            confirmLabel: 'Set active theme'
          }).then(async (confirmed) => {
            if (!confirmed) {
              return
            }
            await api.marketplace.setActiveTheme(profile.id, event.id)
            await refreshWorkspace()
            flashToast(`"${event.name}" is now your active theme.`, 'success')
          })
        }
        return
      }
      flashToast(`Installed "${event.name}" plugin.`, 'success')
      if (profile) {
        void requestConfirm({
          title: 'Enable this plugin?',
          message: `Enable "${event.name}" in AMP now?`,
          confirmLabel: 'Enable plugin'
        }).then(async (confirmed) => {
          if (!confirmed) {
            return
          }
          await api.marketplace.setPluginEnabled(profile.id, event.id, true)
          await refreshWorkspace()
          flashToast(`"${event.name}" is enabled.`, 'success')
        })
      }
    })
  }, [api.marketplace, flashToast, profile, refreshWorkspace, requestConfirm])

  useEffect(() => {
    if (!api.marketplace.onDeepLinkNotice) {
      return undefined
    }

    return api.marketplace.onDeepLinkNotice((event) => {
      flashToast(event.message, event.tone)
    })
  }, [api.marketplace, flashToast])

  const handleCreateAndSignIn = useCallback(
    async (displayName: string) => {
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
      if (api.settings.getAdminProfile) {
        const admin = await api.settings.getAdminProfile(result.profile.id)
        setAdminProfile(admin)
      } else {
        setAdminProfile(null)
      }
    },
    [api.profile, api.settings]
  )

  const handleSignIn = useCallback(
    async (profileId: string) => {
      const result = await api.profile.signIn(profileId)
      setProfile(result.profile)
      setSession(result.session)
      const [savedTheme, savedAppearance] = await Promise.all([
        api.settings.getTheme(result.profile.id),
        api.settings.getAppearance(result.profile.id)
      ])
      setTheme(savedTheme)
      setAppearance(savedAppearance)
      if (api.settings.getAdminProfile) {
        const admin = await api.settings.getAdminProfile(result.profile.id)
        setAdminProfile(admin)
      } else {
        setAdminProfile(null)
      }
      flashToast(`Welcome back, ${result.profile.displayName}`)
    },
    [api.profile, api.settings, flashToast]
  )

  const handleSelectTag = useCallback((tagName: string | null) => {
    setActiveTag(tagName)
    setSelectedPromptId(null)
  }, [])

  const handleCopy = useCallback(
    async (prompt: PromptDTO) => {
      await navigator.clipboard.writeText(prompt.content)
      await api.prompt.markUsed(prompt.profileId, prompt.id)
      await refreshWorkspace()
      flashToast('Prompt copied to clipboard')
    },
    [api.prompt, flashToast, refreshWorkspace]
  )

  const handleCreatePrompt = useCallback(() => {
    setNewPromptOpen(true)
  }, [])

  const handleCreatePromptFromDraft = useCallback(
    async (input: {
      title: string
      content: string
      category?: string
      tags?: string[]
      folder?: string
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
        await refreshWorkspace()
        setSelectedPromptId(created.id)
        setNewPromptOpen(false)
        flashToast('Prompt created')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create prompt'
        flashToast(message)
      }
    },
    [api.prompt, flashToast, profile, refreshWorkspace]
  )

  const handleRefineDraft = useCallback(
    async (content: string) => {
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
    },
    [api.refine, flashToast, profile]
  )

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
        folder: updates.folder || undefined,
        useCase: updates.useCase,
        aiTarget: updates.aiTarget,
        favorite: prompt.favorite,
        pinned: prompt.pinned
      })

      await refreshWorkspace()
      flashToast('Prompt saved')
    },
    [api.prompt, flashToast, profile, refreshWorkspace]
  )

  const handleDeletePrompt = useCallback(
    async (prompt: PromptDTO) => {
      if (!profile) {
        return
      }
      const approved = await requestConfirm({
        title: 'Delete Prompt?',
        message: `Delete "${prompt.title}" permanently?`,
        confirmLabel: 'Delete Prompt',
        tone: 'danger'
      })
      if (!approved) {
        return
      }
      await api.prompt.delete(profile.id, prompt.id)
      await refreshWorkspace()
      flashToast('Prompt deleted', 'warning')
    },
    [api.prompt, flashToast, profile, refreshWorkspace, requestConfirm]
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
      await refreshWorkspace()
      setSelectedPromptId(created.id)
      flashToast('Template added as prompt')
    },
    [api.prompt, flashToast, profile, refreshWorkspace]
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
    [api.refine, profile]
  )

  const handleValidatePrompt = useCallback(
    async (prompt: PromptDTO) => {
      if (!profile) {
        return
      }
      const configured = await api.refine.isConfigured(profile.id)
      if (!configured) {
        flashToast('Set your Groq API key in Settings before validation.')
        openSettings('general')
        return
      }

      setValidatingPromptId(prompt.id)
      try {
        await api.prompt.validateWithGroq(profile.id, prompt.id)
        await refreshWorkspace()
        flashToast('Prompt validated')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Validation failed'
        flashToast(message)
      } finally {
        setValidatingPromptId(null)
      }
    },
    [api.prompt, api.refine, flashToast, openSettings, profile, refreshWorkspace]
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
    [api.refine, flashToast, profile, selectedPrompt]
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
    [api.prompt, flashToast, profile, refineResult, refreshWorkspace, selectedPrompt]
  )

  const handleGenerateShare = useCallback(
    async (promptId: string) => {
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
    },
    [api.share, flashToast, prompts]
  )

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
    [api.share, flashToast, profile, prompts]
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
    [api.share, flashToast, profile, refreshWorkspace]
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
  }, [api.share, flashToast, profile, refreshWorkspace])

  const handleRegisterPlugin = useCallback(
    async (manifest: CreatePluginManifestInput) => {
      if (!profile) {
        return
      }
      await api.marketplace.registerPlugin(profile.id, manifest)
      await refreshWorkspace()
      flashToast('Plugin saved')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleImportPluginManifestFile = useCallback(async () => {
    if (!profile) {
      return
    }
    const result = await api.marketplace.importPluginManifestFile(profile.id)
    if (!result.ok && !result.canceled) {
      throw new Error(result.reason ?? 'Plugin import failed')
    }
    if (result.ok) {
      await refreshWorkspace()
      flashToast('Plugin manifest imported from file')
    }
  }, [api.marketplace, flashToast, profile, refreshWorkspace])

  const handleImportPluginFromFolder = useCallback(async () => {
    if (!profile) {
      return
    }
    const result = await api.marketplace.importPluginFromFolder(profile.id)
    if (!result.ok && !result.canceled) {
      throw new Error(result.reason ?? 'Plugin folder import failed')
    }
    if (result.ok) {
      await refreshWorkspace()
      flashToast('Plugin imported from local folder')
    }
  }, [api.marketplace, flashToast, profile, refreshWorkspace])

  const handleExportPluginManifest = useCallback(
    async (pluginId: string) => {
      if (!profile) {
        return
      }
      const result = await api.marketplace.exportPluginManifest(profile.id, pluginId)
      if (!result.ok && !result.canceled) {
        throw new Error(result.reason ?? 'Plugin export failed')
      }
      if (result.ok) {
        flashToast('Plugin manifest exported')
      }
    },
    [api.marketplace, flashToast, profile]
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
      flashToast('Theme saved')
    },
    [api.marketplace, flashToast, profile, refreshWorkspace]
  )

  const handleImportThemeManifestFile = useCallback(async () => {
    if (!profile) {
      return
    }
    const result = await api.marketplace.importThemeManifestFile(profile.id)
    if (!result.ok && !result.canceled) {
      throw new Error(result.reason ?? 'Theme import failed')
    }
    if (result.ok) {
      await refreshWorkspace()
      flashToast('Theme manifest imported from file')
    }
  }, [api.marketplace, flashToast, profile, refreshWorkspace])

  const handleImportThemeFromFolder = useCallback(async () => {
    if (!profile) {
      return
    }
    const result = await api.marketplace.importThemeFromFolder(profile.id)
    if (!result.ok && !result.canceled) {
      throw new Error(result.reason ?? 'Theme folder import failed')
    }
    if (result.ok) {
      await refreshWorkspace()
      flashToast('Theme imported from local folder')
    }
  }, [api.marketplace, flashToast, profile, refreshWorkspace])

  const handleExportThemeManifest = useCallback(
    async (themeId: string) => {
      if (!profile) {
        return
      }
      const result = await api.marketplace.exportThemeManifest(profile.id, themeId)
      if (!result.ok && !result.canceled) {
        throw new Error(result.reason ?? 'Theme export failed')
      }
      if (result.ok) {
        flashToast('Theme manifest exported')
      }
    },
    [api.marketplace, flashToast, profile]
  )

  const handleSetActiveTheme = useCallback(
    async (themeId: string | null) => {
      if (!profile) {
        return
      }
      await api.marketplace.setActiveTheme(profile.id, themeId)
      await refreshWorkspace()
      flashToast(themeId ? 'Theme activated' : 'Theme cleared')
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
    return <AuthView profiles={profiles} onCreateAndSignIn={handleCreateAndSignIn} onSignIn={handleSignIn} />
  }

  return (
    <>
      <NeoApp
        profileId={profile.id}
        profileName={profile.displayName}
        appVersion={appVersion}
        prompts={prompts}
        templates={templates}
        tags={tags}
        activeTag={activeTag}
        latestUpdated={latestUpdated}
        selectedPromptId={selectedPromptId}
        validatingPromptId={validatingPromptId}
        marketplaceOpen={marketplaceOpen}
        marketplaceUrl={marketplaceUrl}
        marketplaceLoadKey={marketplaceLoadKey}
        marketplaceStatus={marketplaceStatus}
        onSelectPromptId={setSelectedPromptId}
        onSelectTag={handleSelectTag}
        onCreatePrompt={handleCreatePrompt}
        onOpenShareImport={() => setShareOpen(true)}
        onOpenWorkspace={() => setMarketplaceOpen(false)}
        onOpenSettings={() => openSettings('general')}
        onOpenAbout={() => setLegalPage('about')}
        onOpenTos={() => setLegalPage('tos')}
        onOpenMarketplace={openMarketplace}
        onRetryMarketplace={retryMarketplace}
        onMarketplaceLoad={() => setMarketplaceStatus('ready')}
        onMarketplaceError={() => setMarketplaceStatus('error')}
        onCheckForUpdates={handleCheckForUpdates}
        onCopyPrompt={handleCopy}
        onSavePrompt={handleSavePrompt}
        onDeletePrompt={handleDeletePrompt}
        onRefinePrompt={handleOpenRefine}
        onValidatePrompt={handleValidatePrompt}
        onSharePrompt={(prompt) => {
          setSelectedPromptId(prompt.id)
          setShareOpen(true)
        }}
        onAddAsTemplate={handleAddPromptAsTemplate}
        onUseTemplate={handleUseTemplate}
        onCreateTemplate={handleCreateTemplate}
        onUpdateTemplate={handleUpdateTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {settingsOpen && (
        <div className="fixed inset-0 z-[90] bg-bg p-3">
          <div className="flex h-full min-h-0 flex-col border border-line/20 bg-surface shadow-panel">
            <AppTopNav
              title="Settings"
              onSettings={() => openSettings('general')}
              onMarketplace={() => {
                setSettingsOpen(false)
                openMarketplace()
              }}
              onAbout={() => {
                setSettingsOpen(false)
                setLegalPage('about')
              }}
              onTos={() => {
                setSettingsOpen(false)
                setLegalPage('tos')
              }}
              onCheckForUpdates={handleCheckForUpdates}
              onClose={() => setSettingsOpen(false)}
            />
            <div className="scroll-y min-h-0 flex-1 overflow-y-auto p-5">
              <SettingsDialog
                asPage
                section={settingsSection}
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
                onImportPluginManifestFile={handleImportPluginManifestFile}
                onImportPluginFromFolder={handleImportPluginFromFolder}
                onExportPluginManifest={handleExportPluginManifest}
                onTogglePlugin={handleTogglePlugin}
                onRemovePlugin={handleRemovePlugin}
                onOpenPluginFolder={handleOpenPluginFolder}
                onRegisterTheme={handleRegisterTheme}
                onImportThemeManifestFile={handleImportThemeManifestFile}
                onImportThemeFromFolder={handleImportThemeFromFolder}
                onExportThemeManifest={handleExportThemeManifest}
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
                adminProfile={adminProfile}
                onSaveAdminProfile={async (nextProfile) => {
                  const updated = await api.settings.setAdminProfile(profile.id, nextProfile)
                  setAdminProfile(updated)
                  if (updated.displayName && updated.displayName !== profile.displayName) {
                    flashToast(`Admin profile updated for ${updated.displayName}`)
                  }
                }}
                onSetAdminPin={async (pin) => {
                  const updated = await api.settings.setAdminPin(profile.id, pin)
                  setAdminProfile(updated)
                }}
                onVerifyAdminPin={(pin) => api.settings.verifyAdminPin(profile.id, pin)}
                onClearAdminPin={async () => {
                  const updated = await api.settings.clearAdminPin(profile.id)
                  setAdminProfile(updated)
                }}
                onSignOut={async () => {
                  await api.profile.signOut()
                  setSettingsOpen(false)
                  await refreshAuth()
                }}
              />
            </div>
            <AppFooter
              version={appVersion}
              onAbout={() => {
                setSettingsOpen(false)
                setLegalPage('about')
              }}
              onTos={() => {
                setSettingsOpen(false)
                setLegalPage('tos')
              }}
            />
          </div>
        </div>
      )}

      {legalPage && (
        <div className="fixed inset-0 z-[90] bg-bg p-3">
          <div className="flex h-full min-h-0 flex-col border border-line/20 bg-surface shadow-panel">
            <AppTopNav
              title={legalPage === 'about' ? 'About AMP' : 'Terms of Service'}
              onSettings={() => {
                setLegalPage(null)
                openSettings('general')
              }}
              onMarketplace={() => {
                setLegalPage(null)
                openMarketplace()
              }}
              onAbout={() => setLegalPage('about')}
              onTos={() => setLegalPage('tos')}
              onCheckForUpdates={handleCheckForUpdates}
              onClose={() => setLegalPage(null)}
            />
            <div className="scroll-y min-h-0 flex-1 overflow-y-auto p-5">
              {legalPage === 'about' ? <AboutPage /> : <TermsOfServicePage />}
            </div>
            <AppFooter version={appVersion} onAbout={() => setLegalPage('about')} onTos={() => setLegalPage('tos')} />
          </div>
        </div>
      )}

      <NewPromptModal
        open={newPromptOpen}
        isRefineConfigured={newPromptRefineConfigured}
        isRefining={newPromptRefining}
        categorySuggestions={categories.map((item) => item.name)}
        tagSuggestions={tags.map((item) => item.name)}
        onClose={() => setNewPromptOpen(false)}
        onConfigureRefine={() => {
          setNewPromptOpen(false)
          openSettings('general')
          flashToast('Add your Groq API key, then run Improve Draft.')
        }}
        onCreate={handleCreatePromptFromDraft}
        onRefine={handleRefineDraft}
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
