import { app, BrowserWindow, protocol } from 'electron'
import { bootstrapApp } from './app'
import { enqueueProtocolUrl, findProtocolUrl } from './deepLink'
import { PROMPT_IMAGE_PROTOCOL } from './promptImages'

app.setAppUserModelId('com.ampnotes.desktop')
protocol.registerSchemesAsPrivileged([
  {
    scheme: PROMPT_IMAGE_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

function forceExit(code: number): void {
  try {
    if (app.isReady()) {
      app.exit(code)
      return
    }
  } catch {
    // fall through to hard process exit
  }
  process.exit(code)
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  forceExit(0)
}

app.on('second-instance', (_event, argv) => {
  const protocolUrl = findProtocolUrl(argv)
  if (protocolUrl) {
    enqueueProtocolUrl(protocolUrl)
  }
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (win.isMinimized()) {
      win.restore()
    }
    win.focus()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  if (url.startsWith('ampnotes://')) {
    enqueueProtocolUrl(url)
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason)
  forceExit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
  forceExit(1)
})

app.whenReady().then(async () => {
  try {
    app.setAsDefaultProtocolClient('ampnotes')
    const startupUrl = findProtocolUrl(process.argv)
    if (startupUrl) {
      enqueueProtocolUrl(startupUrl)
    }
    await bootstrapApp()
  } catch (error) {
    console.error('Failed to bootstrap app:', error)
    forceExit(1)
  }
})
