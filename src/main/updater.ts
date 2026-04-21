import { app, BrowserWindow, ipcMain } from 'electron'
import updaterPkg from 'electron-updater'

type UpdateInfo = import('electron-updater').UpdateInfo
const { autoUpdater } = updaterPkg

const RELEASES_API_URL = 'https://api.github.com/repos/NolvusMadeIt/ampnotes/releases/latest'
const RELEASES_URL = 'https://github.com/NolvusMadeIt/ampnotes/releases/latest'

interface UpdateCheckResult {
  ok: boolean
  updateAvailable: boolean
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  reason?: string
}

let configured = false
let checking = false

function normalizeVersion(value: string): number[] {
  return value
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number(part.replace(/\D.*$/, '')))
    .map((part) => (Number.isFinite(part) ? part : 0))
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = normalizeVersion(latest)
  const currentParts = normalizeVersion(current)
  const max = Math.max(latestParts.length, currentParts.length)

  for (let index = 0; index < max; index += 1) {
    const nextLatest = latestParts[index] ?? 0
    const nextCurrent = currentParts[index] ?? 0
    if (nextLatest > nextCurrent) {
      return true
    }
    if (nextLatest < nextCurrent) {
      return false
    }
  }

  return false
}

async function checkLatestRelease(): Promise<{ version: string; url: string } | null> {
  const response = await fetch(RELEASES_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `AMP/${app.getVersion()}`
    }
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`GitHub update check failed (${response.status})`)
  }

  const latest = (await response.json()) as { tag_name?: string; html_url?: string }
  if (!latest.tag_name) {
    return null
  }

  return {
    version: latest.tag_name.replace(/^v/i, ''),
    url: latest.html_url ?? RELEASES_URL
  }
}

function configureAutoUpdater(): void {
  if (configured) {
    return
  }

  configured = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('app.updateAvailable', {
        version: info.version,
        currentVersion: app.getVersion()
      })
    }
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('app.updateDownloaded', {
        version: info.version,
        currentVersion: app.getVersion()
      })
    }
  })

  autoUpdater.on('error', (error) => {
    console.warn('AMP update check failed:', error)
  })
}

export function registerAppIpc(): void {
  configureAutoUpdater()

  ipcMain.handle('app.getInfo', () => ({
    version: app.getVersion()
  }))

  ipcMain.handle('app.checkForUpdates', async () => {
    return checkForUpdates(false)
  })
}

export async function checkForUpdates(silent = true): Promise<UpdateCheckResult> {
  if (checking) {
    return {
      ok: true,
      updateAvailable: false,
      currentVersion: app.getVersion(),
      reason: 'Update check already running.'
    }
  }

  checking = true
  try {
    if (app.isPackaged) {
      const result = await autoUpdater.checkForUpdates()
      const updateAvailable = result?.isUpdateAvailable ?? false
      return {
        ok: true,
        updateAvailable,
        currentVersion: app.getVersion(),
        latestVersion: result?.updateInfo?.version
      }
    }

    const latest = await checkLatestRelease()
    const currentVersion = app.getVersion()
    if (!latest) {
      return { ok: true, updateAvailable: false, currentVersion }
    }

    const updateAvailable = isNewerVersion(latest.version, currentVersion)
    if (updateAvailable) {
      return {
        ok: true,
        updateAvailable,
        currentVersion,
        latestVersion: latest.version,
        releaseUrl: latest.url
      }
    }

    return { ok: true, updateAvailable: false, currentVersion, latestVersion: latest.version }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Update check failed.'
    if (!silent) {
      console.warn('AMP update check failed:', reason)
    }
    return { ok: false, updateAvailable: false, currentVersion: app.getVersion(), reason }
  } finally {
    checking = false
  }
}
