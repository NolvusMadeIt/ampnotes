import type { ApiClient } from '@preload/api-types'

declare global {
  interface Window {
    api?: ApiClient
  }
}

export {}
