import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthView } from '@renderer/features/auth/AuthView'
import { NeoApp, type MarketplaceFiltersState, type NeoPage } from '@renderer/features/neo/NeoApp'
import { AboutPage } from '@renderer/features/legal/AboutPage'
import { TermsOfServicePage } from '@renderer/features/legal/TermsOfServicePage'
import { NewPromptModal } from '@renderer/features/prompts/NewPromptModal'
import { SettingsDialog } from '@renderer/features/settings/SettingsDialog'
import { RefineModal } from '@renderer/features/refine/RefineModal'
import { ShareDialog } from '@renderer/features/sharing/ShareDialog'
import { ToastHost, type AppToast, type AppToastAction } from '@renderer/components/ui/ToastHost'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'
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
  MarketplaceDeepLinkInstalledEvent,
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

const DEFAULT_MARKETPLACE_URL =
  import.meta.env.VITE_AMP_MARKETPLACE_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4200/' : 'https://ampmarketplace.vercel.app/')
const MARKETPLACE_URL_STORAGE_KEY = 'ampnotes.marketplace-url.v1'

const DEFAULT_APPEARANCE: AppearanceSettingsDTO = {
  fontFamily: 'merriweather',
  fontScale: 100,
  themePreset: 'midnight',
  defaultPromptView: 'read'
}

const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFiltersState = {
  q: '',
  kind: 'all',
  tier: 'all',
  sort: 'popular',
  technology: 'all'
}

const SESSION_TTL_MS = 48 * 60 * 60 * 1000
const DEFAULT_APP_VERSION = '0.1.9'
const VERIFIED_GUMROAD_LICENSES_STORAGE_KEY = 'ampnotes.gumroad.verified-products.v1'

interface PaidMarketplaceInstallRequest {
  open: boolean
  kind: 'plugin' | 'theme'
  code: string
  purchaseUrl: string
  gumroadProductPermalink: string
}

type UpdateEvent = {
  type: 'available' | 'download-started' | 'download-progress' | 'downloaded' | 'scheduled' | 'error'
  latestVersion?: string
  currentVersion?: string
  releaseUrl?: string
  publishedAt?: string
  updatesMarkdown?: string
  updatesSourceUrl?: string
  installTiming?: 'install_now' | 'app_close'
  strategy?: 'next_launch'
  percent?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
  message?: string
}

type UpdateCheckState = {
  ok: boolean
  updateAvailable: boolean
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  publishedAt?: string
  updatesMarkdown?: string
  updatesSourceUrl?: string
  reason?: string
  packaged: boolean
}

type UpdateActionPending = 'install_now' | 'app_close' | 'next_launch'

function formatUpdateDate(value?: string): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString()
}

function renderUpdateNotes(markdown: string): ReactNode {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={`spacer-${index}`} className="h-1" />
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={`h3-${index}`} className="text-base font-semibold text-text">
              {trimmed.slice(4)}
            </h4>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={`h2-${index}`} className="text-[1.2rem] font-semibold text-text">
              {trimmed.slice(3)}
            </h3>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={`h1-${index}`} className="editorial-heading text-[1.8rem] font-semibold text-text">
              {trimmed.slice(2)}
            </h2>
          )
        }
        if (trimmed.startsWith('- ')) {
          return (
            <p key={`li-${index}`} className="pl-4 text-sm leading-7 text-text">
              • {trimmed.slice(2)}
            </p>
          )
        }
        return (
          <p key={`p-${index}`} className="text-sm leading-7 text-muted">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

function readVerifiedGumroadProducts(): string[] {
  try {
    const raw = window.localStorage.getItem(VERIFIED_GUMROAD_LICENSES_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function isGumroadProductVerified(productPermalink: string): boolean {
  return readVerifiedGumroadProducts().includes(productPermalink)
}

function rememberVerifiedGumroadProduct(productPermalink: string): void {
  const verified = new Set(readVerifiedGumroadProducts())
  verified.add(productPermalink)
  window.localStorage.setItem(VERIFIED_GUMROAD_LICENSES_STORAGE_KEY, JSON.stringify([...verified].sort()))
}

function buildMarketplaceUrl(
  baseUrl: string,
  theme: ThemeMode,
  appearance: AppearanceSettingsDTO,
  activeMarketplaceThemeId: string | undefined,
  filters: MarketplaceFiltersState
): string {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('embedded', '1')
    url.searchParams.set('ampTheme', resolveTheme(theme))
    url.searchParams.set('ampPreset', appearance.themePreset)
    url.searchParams.set('kind', filters.kind)
    url.searchParams.set('tier', filters.tier)
    url.searchParams.set('sort', filters.sort)
    url.searchParams.set('technology', filters.technology)
    if (filters.q.trim()) {
      url.searchParams.set('q', filters.q.trim())
    }
    if (activeMarketplaceThemeId) {
      url.searchParams.set('activeThemeId', activeMarketplaceThemeId)
    }
    return url.toString()
  } catch {
    return `${DEFAULT_MARKETPLACE_URL}?embedded=1`
  }
}

function normalizeMarketplaceBaseUrl(value: string): string {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Marketplace URL must start with https:// or http://.')
  }
  return url.toString()
}

function readMarketplaceBaseUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_MARKETPLACE_URL
  }
  const stored = window.localStorage.getItem(MARKETPLACE_URL_STORAGE_KEY)
  if (!stored) {
    return DEFAULT_MARKETPLACE_URL
  }
  try {
    return normalizeMarketplaceBaseUrl(stored)
  } catch {
    return DEFAULT_MARKETPLACE_URL
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Image read failed.'))
      }
    }
    reader.onerror = () => reject(new Error('Image read failed.'))
    reader.readAsDataURL(file)
  })
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
  const [settingsSection, setSettingsSection] = useState<'general' | 'plugins' | 'themes' | 'admin' | 'about' | 'all'>('all')
  const [legalPage, setLegalPage] = useState<'about' | 'tos' | null>(null)
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [marketplaceLoadKey, setMarketplaceLoadKey] = useState(0)
  const [marketplaceStatus, setMarketplaceStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [marketplaceBaseUrl, setMarketplaceBaseUrl] = useState(readMarketplaceBaseUrl)
  const [marketplaceFilters, setMarketplaceFilters] =
    useState<MarketplaceFiltersState>(DEFAULT_MARKETPLACE_FILTERS)
  const [paidInstall, setPaidInstall] = useState<PaidMarketplaceInstallRequest | null>(null)
  const [gumroadLicenseKey, setGumroadLicenseKey] = useState('')
  const [gumroadVerifying, setGumroadVerifying] = useState(false)

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
  const [updateCenterOpen, setUpdateCenterOpen] = useState(false)
  const [updateCenterLoading, setUpdateCenterLoading] = useState(false)
  const [updateState, setUpdateState] = useState<UpdateCheckState | null>(null)
  const [updateActionPending, setUpdateActionPending] = useState<UpdateActionPending | null>(null)
  const [updateActionStatus, setUpdateActionStatus] = useState<string | null>(null)

  const toastTimersRef = useRef<Map<number, number>>(new Map())
  const sessionExpiryTimerRef = useRef<number | null>(null)
  const toastCounterRef = useRef(1)
  const updateToastIdRef = useRef<number | null>(null)
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
    return buildMarketplaceUrl(marketplaceBaseUrl, theme, appearance, activeMarketplaceTheme?.id, marketplaceFilters)
  }, [activeMarketplaceTheme?.id, appearance.themePreset, marketplaceBaseUrl, marketplaceFilters, theme])

  const handleMarketplaceFiltersChange = useCallback((filters: MarketplaceFiltersState) => {
    setMarketplaceStatus('loading')
    setMarketplaceFilters(filters)
  }, [])

  const handleMarketplaceBaseUrlChange = useCallback((nextUrl: string) => {
    const normalized = normalizeMarketplaceBaseUrl(nextUrl)
    window.localStorage.setItem(MARKETPLACE_URL_STORAGE_KEY, normalized)
    setMarketplaceBaseUrl(normalized)
    setMarketplaceStatus('loading')
    setMarketplaceLoadKey((current) => current + 1)
  }, [])

  const openMarketplace = useCallback(() => {
    setMarketplaceStatus('loading')
    setMarketplaceLoadKey((current) => current + 1)
    setSettingsOpen(false)
    setLegalPage(null)
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

  const upsertToast = useCallback((toast: AppToast) => {
    setToasts((prev) => {
      const index = prev.findIndex((entry) => entry.id === toast.id)
      if (index >= 0) {
        const next = [...prev]
        next[index] = toast
        return next
      }
      return [...prev, toast].slice(-4)
    })
  }, [])

  const flashToast = useCallback((
    message: string,
    tone: AppToast['tone'] = 'info',
    options?: {
      title?: string
      persistent?: boolean
      progress?: number
      actions?: AppToastAction[]
      durationMs?: number
    }
  ) => {
    const id = toastCounterRef.current++
    const toast: AppToast = {
      id,
      title: options?.title,
      message,
      tone,
      persistent: options?.persistent,
      progress: options?.progress,
      actions: options?.actions
    }
    upsertToast(toast)
    if (options?.persistent) {
      return id
    }
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== id))
      toastTimersRef.current.delete(id)
    }, options?.durationMs ?? 8000)
    toastTimersRef.current.set(id, timer)
    return id
  }, [upsertToast])

  const clearUpdateToast = useCallback(() => {
    if (updateToastIdRef.current !== null) {
      removeToast(updateToastIdRef.current)
      updateToastIdRef.current = null
    }
  }, [removeToast])

  const runUpdateCheck = useCallback(async (openOverlay: boolean) => {
    if (!api.app?.checkForUpdates) {
      flashToast(`AMP ${appVersion} is up to date.`)
      return null
    }
    if (openOverlay) {
      setUpdateCenterOpen(true)
    }
    setUpdateCenterLoading(true)
    try {
      const result = await api.app.checkForUpdates()
      setUpdateState(result)
      if (!result.ok) {
        flashToast(result.reason ?? 'Update check failed.', 'warning')
        return null
      }
      if (!result.updateAvailable && !openOverlay) {
        flashToast(`AMP ${result.currentVersion} is up to date.`)
      }
      return result
    } finally {
      setUpdateCenterLoading(false)
    }
  }, [api.app, appVersion, flashToast])

  const scheduleUpdateForNextLaunch = useCallback(async () => {
    if (!api.app?.scheduleUpdate) {
      flashToast('Update scheduling is not available in this build.', 'warning')
      return
    }
    setUpdateActionPending('next_launch')
    setUpdateActionStatus('Scheduling update for next launch...')
    try {
      const result = await api.app.scheduleUpdate('next_launch')
      if (!result.ok) {
        flashToast(result.reason ?? 'Could not schedule update for next launch.', 'warning')
        setUpdateActionStatus('Could not schedule update for next launch.')
        return
      }
      clearUpdateToast()
      setUpdateActionStatus('Update scheduled for next launch.')
      flashToast('Update scheduled for next launch.', 'success')
    } finally {
      setUpdateActionPending(null)
    }
  }, [api.app, clearUpdateToast, flashToast])

  const downloadUpdate = useCallback(async (timing: 'install_now' | 'app_close') => {
    if (!api.app?.downloadUpdate) {
      flashToast('Installer download is not available in this build.', 'warning')
      return
    }
    setUpdateActionPending(timing)
    setUpdateActionStatus(
      timing === 'install_now'
        ? 'Preparing immediate update download...'
        : 'Preparing update download for install on close...'
    )
    try {
      const result = await api.app.downloadUpdate(timing)
      if (!result.ok) {
        flashToast(result.reason ?? 'Unable to start update download.', 'warning')
        setUpdateActionPending(null)
        setUpdateActionStatus('Unable to start update download.')
        return
      }
    } catch (error) {
      setUpdateActionPending(null)
      setUpdateActionStatus(error instanceof Error ? error.message : 'Unable to start update download.')
      throw error
    }
  }, [api.app, flashToast])

  const showUpdateActionsToast = useCallback(
    (event: {
      latestVersion?: string
      currentVersion?: string
      releaseUrl?: string
      publishedAt?: string
      updatesMarkdown?: string
      updatesSourceUrl?: string
    }) => {
      const toastId = updateToastIdRef.current ?? toastCounterRef.current++
      updateToastIdRef.current = toastId
      const actions: AppToastAction[] = [
        {
          id: 'update-now',
          label: 'Update now',
          tone: 'primary',
          onClick: () => {
            void downloadUpdate('install_now')
          }
        },
        {
          id: 'update-next-launch',
          label: 'Next launch auto',
          onClick: () => {
            void scheduleUpdateForNextLaunch()
          }
        },
        {
          id: 'update-on-close',
          label: 'When app closes',
          onClick: () => {
            void downloadUpdate('app_close')
          }
        },
        {
          id: 'update-view',
          label: 'View changes',
          onClick: () => {
            setUpdateCenterOpen(true)
          }
        }
      ]

      const published = formatUpdateDate(event.publishedAt)
      upsertToast({
        id: toastId,
        title: `Update ${event.latestVersion ?? 'available'}`,
        message: published
          ? `Current ${event.currentVersion ?? appVersion} • Published ${published}`
          : `Current ${event.currentVersion ?? appVersion}`,
        tone: 'success',
        persistent: true,
        actions
      })

      setUpdateState((prev) => ({
        ok: true,
        updateAvailable: true,
        currentVersion: event.currentVersion ?? prev?.currentVersion ?? appVersion,
        latestVersion: event.latestVersion ?? prev?.latestVersion,
        releaseUrl: event.releaseUrl ?? prev?.releaseUrl,
        publishedAt: event.publishedAt ?? prev?.publishedAt,
        updatesMarkdown: event.updatesMarkdown ?? prev?.updatesMarkdown,
        updatesSourceUrl: event.updatesSourceUrl ?? prev?.updatesSourceUrl,
        packaged: prev?.packaged ?? Boolean(api.app)
      }))
    },
    [api.app, appVersion, downloadUpdate, scheduleUpdateForNextLaunch, upsertToast]
  )

  const handleCheckForUpdates = useCallback(async () => {
    const result = await runUpdateCheck(true)
    if (!result?.ok || !result.updateAvailable) {
      return
    }
    showUpdateActionsToast(result)
  }, [runUpdateCheck, showUpdateActionsToast])

  useEffect(() => {
    if (!api.app?.onUpdateEvent) {
      return undefined
    }

    return api.app.onUpdateEvent((event: UpdateEvent) => {
      if (event.type === 'available') {
        showUpdateActionsToast(event)
        return
      }
      if (event.type === 'download-started') {
        setUpdateActionStatus(
          event.installTiming === 'install_now'
            ? 'Downloading update now. AMP will restart when complete.'
            : 'Downloading update now. It will install when AMP closes.'
        )
        const toastId = updateToastIdRef.current ?? toastCounterRef.current++
        updateToastIdRef.current = toastId
        upsertToast({
          id: toastId,
          title: 'Downloading update',
          message:
            event.installTiming === 'install_now'
              ? 'AMP will restart as soon as download finishes.'
              : 'Update will install automatically when AMP closes.',
          tone: 'warning',
          persistent: true,
          progress: 0
        })
        return
      }
      if (event.type === 'download-progress') {
        const percent = Math.max(0, Math.min(100, Math.round(event.percent ?? 0)))
        setUpdateActionStatus(`Downloading update... ${percent}%`)
        const toastId = updateToastIdRef.current ?? toastCounterRef.current++
        updateToastIdRef.current = toastId
        upsertToast({
          id: toastId,
          title: 'Downloading update',
          message: 'Preparing update package...',
          tone: 'warning',
          persistent: true,
          progress: event.percent ?? 0
        })
        return
      }
      if (event.type === 'downloaded') {
        setUpdateActionPending(null)
        setUpdateActionStatus(
          event.installTiming === 'install_now'
            ? 'Download complete. Finalizing install now...'
            : 'Download complete. Ready to install when AMP closes.'
        )
        const toastId = updateToastIdRef.current ?? toastCounterRef.current++
        updateToastIdRef.current = toastId
        upsertToast({
          id: toastId,
          title: 'Ready to install',
          message:
            event.installTiming === 'install_now'
              ? 'Finalizing installation now.'
              : 'Update is ready. It will install when you close AMP.',
          tone: 'success',
          persistent: true,
          progress: 100,
          actions: [
            {
              id: 'downloaded-release',
              label: 'View release',
              onClick: () => {
                void api.app?.openReleasePage?.()
              }
            },
            {
              id: 'downloaded-close',
              label: 'Dismiss',
              onClick: () => {
                clearUpdateToast()
              }
            }
          ]
        })
        return
      }
      if (event.type === 'scheduled') {
        setUpdateActionPending(null)
        setUpdateActionStatus('Update scheduled for next launch.')
        flashToast('Update is scheduled for next launch.', 'success')
        return
      }
      if (event.type === 'error') {
        setUpdateActionPending(null)
        setUpdateActionStatus(event.message ?? 'Update flow failed.')
        flashToast(event.message ?? 'Update flow failed.', 'danger')
      }
    })
  }, [api.app, clearUpdateToast, flashToast, showUpdateActionsToast, upsertToast])

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

  const openSettings = useCallback((section: 'general' | 'plugins' | 'themes' | 'admin' | 'about' | 'all') => {
    setSettingsSection(section)
    setMarketplaceOpen(false)
    setLegalPage(null)
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
  }, [api.marketplace, api.prompt, api.tag, api.template, profile, selectedPromptId])

  const handleMarketplaceInstalledEvent = useCallback(
    (event: MarketplaceDeepLinkInstalledEvent) => {
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
    },
    [api.marketplace, flashToast, profile, refreshWorkspace, requestConfirm]
  )

  const verifyPaidMarketplaceInstall = useCallback(async () => {
    if (!profile || !paidInstall) {
      return
    }

    const licenseKey = gumroadLicenseKey.trim()
    if (!licenseKey) {
      flashToast('Enter the Gumroad license key first.', 'warning')
      return
    }

    setGumroadVerifying(true)
    try {
      const form = new URLSearchParams({
        product_permalink: paidInstall.gumroadProductPermalink,
        license_key: licenseKey,
        increment_uses_count: 'false'
      })
      const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      })
      const result = (await response.json()) as {
        success?: boolean
        message?: string
        purchase?: {
          refunded?: boolean
          chargebacked?: boolean
          disputed?: boolean
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? 'Gumroad could not verify that license.')
      }

      if (result.purchase?.refunded || result.purchase?.chargebacked || result.purchase?.disputed) {
        throw new Error('That license is not eligible for install.')
      }

      rememberVerifiedGumroadProduct(paidInstall.gumroadProductPermalink)
      const installed = await api.marketplace.installCode(profile.id, paidInstall.kind, paidInstall.code)
      setPaidInstall(null)
      setGumroadLicenseKey('')
      handleMarketplaceInstalledEvent(installed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'License verification failed.'
      flashToast(message, 'danger')
    } finally {
      setGumroadVerifying(false)
    }
  }, [api.marketplace, flashToast, gumroadLicenseKey, handleMarketplaceInstalledEvent, paidInstall, profile])

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

    return api.marketplace.onDeepLinkInstalled(handleMarketplaceInstalledEvent)
  }, [api.marketplace, handleMarketplaceInstalledEvent])

  useEffect(() => {
    if (!api.marketplace.onDeepLinkNotice) {
      return undefined
    }

    return api.marketplace.onDeepLinkNotice((event) => {
      flashToast(event.message, event.tone)
    })
  }, [api.marketplace, flashToast])

  useEffect(() => {
    if (!profile || !api.marketplace.installCode) {
      return undefined
    }

    let marketplaceOrigin = ''
    try {
      marketplaceOrigin = new URL(marketplaceBaseUrl).origin
    } catch {
      return undefined
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== marketplaceOrigin || !event.data || typeof event.data !== 'object') {
        return
      }

      const payload = event.data as {
        source?: string
        type?: string
        kind?: 'plugin' | 'theme'
        code?: string
        purchaseUrl?: string
        gumroadProductPermalink?: string
      }

      if (
        payload.source !== 'ampmarketplace' ||
        (payload.kind !== 'plugin' && payload.kind !== 'theme') ||
        typeof payload.code !== 'string'
      ) {
        return
      }

      if (payload.type === 'purchase') {
        if (typeof payload.purchaseUrl !== 'string' || typeof payload.gumroadProductPermalink !== 'string') {
          flashToast('This paid listing is missing Gumroad verification metadata.', 'danger')
          return
        }
        if (isGumroadProductVerified(payload.gumroadProductPermalink)) {
          void api.marketplace
            .installCode(profile.id, payload.kind, payload.code)
            .then(handleMarketplaceInstalledEvent)
            .catch((error) => {
              const message = error instanceof Error ? error.message : 'Marketplace install failed.'
              flashToast(message, 'danger')
            })
          return
        }
        setPaidInstall({
          open: true,
          kind: payload.kind,
          code: payload.code,
          purchaseUrl: payload.purchaseUrl,
          gumroadProductPermalink: payload.gumroadProductPermalink
        })
        setGumroadLicenseKey('')
        return
      }

      if (payload.type !== 'install') {
        return
      }

      void api.marketplace
        .installCode(profile.id, payload.kind, payload.code)
        .then(handleMarketplaceInstalledEvent)
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Marketplace install failed.'
          flashToast(message, 'danger')
        })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [api.marketplace, flashToast, handleMarketplaceInstalledEvent, marketplaceBaseUrl, profile])

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

  const handleSavePromptImage = useCallback(
    async (promptId: string, file: File) => {
      if (!profile) {
        throw new Error('Sign in before adding prompt images.')
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files can be added to prompt markdown.')
      }

      const dataUrl = await fileToDataUrl(file)
      const result = await api.prompt.saveImage({
        profileId: profile.id,
        promptId,
        fileName: file.name || 'pasted-image.png',
        mimeType: file.type,
        dataUrl
      })
      flashToast('Image added to prompt markdown', 'success')
      return result.markdown
    },
    [api.prompt, flashToast, profile]
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

  const page: NeoPage = settingsOpen ? 'settings' : legalPage === 'about' ? 'about' : legalPage === 'tos' ? 'tos' : marketplaceOpen ? 'marketplace' : 'workspace'
  const settingsPage = (
    <SettingsDialog
      asPage
      section={settingsSection}
      currentTheme={theme}
      appearance={appearance}
      marketplaceState={marketplaceState}
      marketplaceBaseUrl={marketplaceBaseUrl}
      defaultMarketplaceBaseUrl={DEFAULT_MARKETPLACE_URL}
      onThemeChange={async (nextTheme) => {
        setTheme(nextTheme)
        await api.settings.setTheme(profile.id, nextTheme)
      }}
      onAppearanceChange={async (nextAppearance) => {
        setAppearance(nextAppearance)
        await api.settings.setAppearance(profile.id, nextAppearance)
      }}
      onMarketplaceBaseUrlChange={async (nextUrl) => handleMarketplaceBaseUrlChange(nextUrl)}
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
  )
  const legalView = legalPage === 'about' ? <AboutPage /> : legalPage === 'tos' ? <TermsOfServicePage /> : null

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
        page={page}
        marketplaceUrl={marketplaceUrl}
        marketplaceLoadKey={marketplaceLoadKey}
        marketplaceStatus={marketplaceStatus}
        marketplaceFilters={marketplaceFilters}
        defaultPromptView={appearance.defaultPromptView}
        settingsView={settingsPage}
        legalView={legalView}
        onSelectPromptId={setSelectedPromptId}
        onSelectTag={handleSelectTag}
        onCreatePrompt={handleCreatePrompt}
        onOpenShareImport={() => setShareOpen(true)}
        onOpenWorkspace={() => {
          setMarketplaceOpen(false)
          setSettingsOpen(false)
          setLegalPage(null)
        }}
        onOpenSettings={() => openSettings('general')}
        onOpenAbout={() => {
          setMarketplaceOpen(false)
          setSettingsOpen(false)
          setLegalPage('about')
        }}
        onOpenTos={() => {
          setMarketplaceOpen(false)
          setSettingsOpen(false)
          setLegalPage('tos')
        }}
        onOpenMarketplace={openMarketplace}
        onRetryMarketplace={retryMarketplace}
        onMarketplaceLoad={() => setMarketplaceStatus('ready')}
        onMarketplaceError={() => setMarketplaceStatus('error')}
        onMarketplaceFiltersChange={handleMarketplaceFiltersChange}
        onCheckForUpdates={handleCheckForUpdates}
        onCopyPrompt={handleCopy}
        onSavePrompt={handleSavePrompt}
        onSavePromptImage={handleSavePromptImage}
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

      <Modal
        open={Boolean(paidInstall?.open)}
        title="Verify Gumroad license"
        widthClass="max-w-xl"
        onClose={() => {
          setPaidInstall(null)
          setGumroadLicenseKey('')
        }}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            Purchase the asset through Gumroad, then paste the license key here. AMP verifies the key before installing
            the marketplace asset. Once verified, this product stays unlocked on this device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (paidInstall?.purchaseUrl) {
                  window.open(paidInstall.purchaseUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              Open Gumroad
            </Button>
          </div>
          <label className="block text-sm font-semibold">
            License key
            <input
              className="mt-2 h-10 w-full rounded-md border border-line/20 bg-surface2 px-3 text-sm outline-none focus:border-accent"
              value={gumroadLicenseKey}
              onChange={(event) => setGumroadLicenseKey(event.target.value)}
              placeholder="Paste Gumroad license key"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPaidInstall(null)
                setGumroadLicenseKey('')
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={gumroadVerifying} onClick={verifyPaidMarketplaceInstall}>
              {gumroadVerifying ? 'Verifying...' : 'Verify and install'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={updateCenterOpen}
        title="Updates"
        widthClass="max-w-4xl"
        onClose={() => setUpdateCenterOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-md border border-line/20 bg-surface2 p-3">
            <p className="text-sm font-semibold text-text">Installed version: {appVersion}</p>
            <p className="mt-1 text-xs text-muted">
              {updateState?.latestVersion
                ? `Latest release: ${updateState.latestVersion}${updateState.publishedAt ? ` • ${formatUpdateDate(updateState.publishedAt)}` : ''}`
                : 'Latest release: checking...'}
            </p>
            {!updateState?.ok && updateState?.reason ? (
              <p className="mt-2 text-xs text-danger">{updateState.reason}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void runUpdateCheck(false)
              }}
              disabled={updateCenterLoading}
            >
              {updateCenterLoading ? 'Checking...' : 'Check again'}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void downloadUpdate('install_now')
              }}
              disabled={!updateState?.updateAvailable || updateActionPending !== null}
            >
              {updateActionPending === 'install_now' ? 'Starting update...' : 'Update now'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void downloadUpdate('app_close')
              }}
              disabled={!updateState?.updateAvailable || updateActionPending !== null}
            >
              {updateActionPending === 'app_close' ? 'Scheduling install...' : 'Install on close'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void scheduleUpdateForNextLaunch()
              }}
              disabled={updateActionPending !== null}
            >
              {updateActionPending === 'next_launch' ? 'Scheduling...' : 'Auto next launch'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void api.app?.openReleasePage?.()
              }}
            >
              Open release page
            </Button>
          </div>
          {updateActionStatus ? <p className="text-xs text-muted">{updateActionStatus}</p> : null}

          <div className="max-h-[52vh] overflow-y-auto rounded-md border border-line/20 bg-surface p-4">
            {updateState?.updatesMarkdown?.trim()
              ? renderUpdateNotes(updateState.updatesMarkdown)
              : (
                <p className="text-sm text-muted">
                  No `updates.md` notes found in the repository yet.
                </p>
                )}
          </div>

          {updateState?.updatesSourceUrl ? (
            <p className="text-xs text-muted">
              Notes source: {updateState.updatesSourceUrl}
            </p>
          ) : null}
        </div>
      </Modal>

      <ToastHost toasts={toasts} onClose={removeToast} />
    </>
  )
}
