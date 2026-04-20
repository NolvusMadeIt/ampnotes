import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
  maximized?: boolean
}

const DEFAULT_WINDOW_BOUNDS: WindowBounds = {
  width: 1680,
  height: 980
}
const MIN_WINDOW_WIDTH = 1100
const MIN_WINDOW_HEIGHT = 720
const WINDOW_STATE_FILE = 'window-state.json'

function getWindowIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.ico')
  }

  return join(process.cwd(), 'src/assets/imgs/icon.ico')
}

function getWindowStatePath(): string {
  return join(app.getPath('userData'), WINDOW_STATE_FILE)
}

function readWindowBounds(): WindowBounds {
  const fallback = DEFAULT_WINDOW_BOUNDS
  const statePath = getWindowStatePath()
  if (!existsSync(statePath)) {
    return fallback
  }

  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8')) as Partial<WindowBounds>
    const width = Number(parsed.width)
    const height = Number(parsed.height)
    const x = Number(parsed.x)
    const y = Number(parsed.y)
    const maximized = parsed.maximized === true

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return fallback
    }

    const nextBounds: WindowBounds = {
      width: Math.max(MIN_WINDOW_WIDTH, Math.round(width)),
      height: Math.max(MIN_WINDOW_HEIGHT, Math.round(height))
    }

    if (Number.isFinite(x) && Number.isFinite(y)) {
      nextBounds.x = Math.round(x)
      nextBounds.y = Math.round(y)
    }

    const display = screen.getDisplayMatching({
      x: nextBounds.x ?? 0,
      y: nextBounds.y ?? 0,
      width: nextBounds.width,
      height: nextBounds.height
    })
    nextBounds.width = Math.min(nextBounds.width, display.workArea.width)
    nextBounds.height = Math.min(nextBounds.height, display.workArea.height)
    nextBounds.maximized = maximized

    const withinDisplay =
      nextBounds.x === undefined ||
      nextBounds.y === undefined ||
      (nextBounds.x >= display.workArea.x - 40 &&
        nextBounds.y >= display.workArea.y - 40 &&
        nextBounds.x < display.workArea.x + display.workArea.width - 80 &&
        nextBounds.y < display.workArea.y + display.workArea.height - 80)

    if (!withinDisplay) {
      delete nextBounds.x
      delete nextBounds.y
    }

    return nextBounds
  } catch {
    return fallback
  }
}

function saveWindowBounds(win: BrowserWindow): void {
  if (win.isDestroyed() || win.isMinimized()) {
    return
  }

  const bounds = {
    ...win.getBounds(),
    maximized: win.isMaximized()
  }
  const statePath = getWindowStatePath()
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify(bounds, null, 2), 'utf8')
}

export function createMainWindow(): BrowserWindow {
  const savedBounds = readWindowBounds()
  const winIcon = getWindowIconPath()

  const win = new BrowserWindow({
    title: 'AMP',
    ...savedBounds,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8f4ee',
    icon: winIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.setMenuBarVisibility(false)
  win.removeMenu()

  let saveTimer: NodeJS.Timeout | null = null
  const queueSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveWindowBounds(win)
    }, 350)
  }

  win.on('resize', queueSave)
  win.on('move', queueSave)
  win.on('close', () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    saveWindowBounds(win)
  })

  if (savedBounds.maximized) {
    win.maximize()
  }

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function getSenderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

ipcMain.handle('window.minimize', (event) => {
  getSenderWindow(event)?.minimize()
})

ipcMain.handle('window.toggleMaximize', (event) => {
  const win = getSenderWindow(event)
  if (!win) {
    return
  }
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})

ipcMain.handle('window.close', (event) => {
  getSenderWindow(event)?.close()
})
