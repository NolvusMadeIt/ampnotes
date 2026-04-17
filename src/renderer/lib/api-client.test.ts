// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getApi, hasDesktopBridge } from './api-client'

describe('api-client', () => {
  it('falls back to browser API when desktop bridge is unavailable', async () => {
    window.api = undefined

    expect(hasDesktopBridge()).toBe(false)

    const api = getApi()
    const active = await api.profile.getSession()

    expect(active).not.toBeNull()
    expect(active?.profile.displayName).toBeTruthy()
    expect(typeof api.prompt.list).toBe('function')
  })
})
