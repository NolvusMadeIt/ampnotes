import { app } from 'electron'
import { bootstrapApp } from './app'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error)
})

app.whenReady().then(async () => {
  try {
    await bootstrapApp()
  } catch (error) {
    console.error('Failed to bootstrap app:', error)
    app.quit()
  }
})
