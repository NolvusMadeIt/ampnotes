import { app, BrowserWindow, dialog, ipcMain, shell, type MessageBoxOptions, type MessageBoxReturnValue } from 'electron'
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
  reason?: string
}

let configured = false
let checking = false

function showMessage(
  win: BrowserWindow | null,
  options: MessageBoxOptions
): Promise<MessageBoxReturnValue> {
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options)
}

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

async function promptOpenRelease(
  win: BrowserWindow | null,
  latestVersion: string,
  releaseUrl: string
): Promise<void> {
  const result = await showMessage(win, {
    type: 'info',
    buttons: ['Open release', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'AMP update available',
    message: `AMP ${latestVersion} is available.`,
    detail: `You are running AMP ${app.getVersion()}. Open the release page to download the newest installer.`
  })

  if (result.response === 0) {
    await shell.openExternal(releaseUrl)
  }
}

function configureAutoUpdater(): void {
  if (configured) {
    return
  }

  configured = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', async (info: UpdateInfo) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
    const result = await showMessage(win, {
      type: 'info',
      buttons: ['Download update', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'AMP update available',
      message: `AMP ${info.version} is available.`,
      detail: `You are running AMP ${app.getVersion()}. Download the update now?`
    })

    if (result.response === 0) {
      await autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
    const result = await showMessage(win, {
      type: 'info',
      buttons: ['Restart and install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'AMP update ready',
      message: `AMP ${info.version} is ready to install.`,
      detail: 'Restart AMP now to complete the update.'
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
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

  ipcMain.handle('app.checkForUpdates', async (event) => {
    return checkForUpdates(BrowserWindow.fromWebContents(event.sender), false)
  })
}

export async function checkForUpdates(
  win: BrowserWindow | null,
  silent = true
): Promise<UpdateCheckResult> {
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
      return {
        ok: true,
        updateAvailable: Boolean(result?.updateInfo?.version),
        currentVersion: app.getVersion(),
        latestVersion: result?.updateInfo?.version
      }
    }

    const latest = await checkLatestRelease()
    const currentVersion = app.getVersion()
    if (!latest) {
      if (!silent) {
        await showMessage(win, {
          type: 'info',
          title: 'AMP updates',
          message: 'No published AMP releases were found yet.'
        })
      }
      return { ok: true, updateAvailable: false, currentVersion }
    }

    const updateAvailable = isNewerVersion(latest.version, currentVersion)
    if (updateAvailable) {
      await promptOpenRelease(win, latest.version, latest.url)
      return { ok: true, updateAvailable, currentVersion, latestVersion: latest.version }
    }

    if (!silent) {
      await showMessage(win, {
        type: 'info',
        title: 'AMP is up to date',
        message: `You are running AMP ${currentVersion}.`
      })
    }

    return { ok: true, updateAvailable: false, currentVersion, latestVersion: latest.version }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Update check failed.'
    if (!silent) {
      await showMessage(win, {
        type: 'warning',
        title: 'AMP update check failed',
        message: reason
      })
    }
    return { ok: false, updateAvailable: false, currentVersion: app.getVersion(), reason }
  } finally {
    checking = false
  }
}
