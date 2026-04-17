import type { ApiClient } from '@preload/api-types'
import { createBrowserApiClient } from '@renderer/lib/browser-api'

let browserApi: ApiClient | null = null

export function hasDesktopBridge() {
  return Boolean(window.api)
}

export function getApi() {
  if (window.api) {
    return window.api
  }

  if (!browserApi) {
    browserApi = createBrowserApiClient()
  }

  return browserApi
}
