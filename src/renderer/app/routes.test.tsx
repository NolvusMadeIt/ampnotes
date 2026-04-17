// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Routes from './routes'

function buildApiMock() {
  return {
    profile: {
      list: vi.fn().mockResolvedValue([]),
      getSession: vi.fn().mockResolvedValue(null),
      createAndSignIn: vi.fn().mockResolvedValue({
        profile: {
          id: 'p1',
          displayName: 'Nora',
          avatarSeed: 'N',
          preferredTheme: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSignedInAt: new Date().toISOString()
        },
        session: {
          id: 's1',
          profileId: 'p1',
          active: true,
          signedInAt: new Date().toISOString(),
          signedOutAt: null
        }
      }),
      signIn: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ ok: true }),
      updateTheme: vi.fn()
    },
    prompt: {
      list: vi.fn().mockResolvedValue([]),
      recent: vi.fn().mockResolvedValue([]),
      tags: vi.fn().mockResolvedValue([]),
      categories: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      toggleFavorite: vi.fn(),
      togglePinned: vi.fn(),
      markUsed: vi.fn(),
      versions: vi.fn(),
      applyRefinement: vi.fn(),
      validateWithGroq: vi.fn()
    },
    tag: {
      list: vi.fn().mockResolvedValue([])
    },
    search: {
      query: vi.fn().mockResolvedValue([])
    },
    template: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    refine: {
      providers: vi.fn(),
      isConfigured: vi.fn().mockResolvedValue(false),
      saveApiKey: vi.fn(),
      clearApiKey: vi.fn(),
      prompt: vi.fn()
    },
    share: {
      generateCode: vi.fn(),
      exportPrompt: vi.fn(),
      importCode: vi.fn(),
      importFile: vi.fn(),
      exportSelected: vi.fn()
    },
    settings: {
      getTheme: vi.fn().mockResolvedValue('system'),
      setTheme: vi.fn().mockResolvedValue('system'),
      getAppearance: vi.fn().mockResolvedValue({
        fontFamily: 'merriweather',
        fontScale: 100,
        themePreset: 'midnight'
      }),
      setAppearance: vi.fn().mockResolvedValue({
        fontFamily: 'merriweather',
        fontScale: 100,
        themePreset: 'midnight'
      })
    },
    marketplace: {
      getState: vi.fn().mockResolvedValue({
        plugins: [],
        themes: [],
        activeThemeId: null
      }),
      registerPlugin: vi.fn(),
      setPluginEnabled: vi.fn(),
      removePlugin: vi.fn(),
      openPluginFolder: vi.fn(),
      registerTheme: vi.fn(),
      setActiveTheme: vi.fn(),
      removeTheme: vi.fn(),
      openThemeFolder: vi.fn()
    }
  }
}

describe('Routes', () => {
  it('allows local profile creation flow from auth screen', async () => {
    const apiMock = buildApiMock()
    Object.defineProperty(window, 'api', {
      value: apiMock,
      writable: true
    })

    render(<Routes />)

    await waitFor(() => {
      expect(screen.getByText('Adaptive Markdown Prompts')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Display name')
    await userEvent.type(input, 'Nora')
    await userEvent.click(screen.getByText('Create & Sign In'))

    expect(apiMock.profile.createAndSignIn).toHaveBeenCalledWith('Nora')
  })
})
