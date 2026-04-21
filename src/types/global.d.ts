import type { ApiClient } from '@preload/api-types'

declare global {
  interface Window {
    api?: ApiClient
  }

  interface ImportMetaEnv {
    readonly VITE_AMP_MARKETPLACE_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

declare module '*.png' {
  const value: string
  export default value
}

export {}
