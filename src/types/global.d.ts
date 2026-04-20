import type { ApiClient } from '@preload/api-types'

declare global {
  interface Window {
    api?: ApiClient
  }
}

declare module '*.png' {
  const value: string
  export default value
}

export {}
