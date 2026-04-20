import { app, BrowserWindow } from 'electron'
import { bootstrapApp } from './app'
import { enqueueProtocolUrl, findProtocolUrl } from './deepLink'

app.setAppUserModelId('com.ampnotes.desktop')

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
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
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
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
    app.quit()
  }
})
