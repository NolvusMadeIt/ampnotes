import { create } from 'zustand'

export type NavSection =
  | 'all'
  | 'favorites'
  | 'pinned'
  | 'recent'
  | 'templates'
  | 'settings'
  | 'pluginSettings'
  | 'themeSettings'
  | 'about'
  | 'tos'

interface PromptUiState {
  nav: NavSection
  search: string
  activeTag: string | null
  selectedPromptId: string | null
  setNav: (nav: NavSection) => void
  setSearch: (search: string) => void
  setActiveTag: (tag: string | null) => void
  setSelectedPromptId: (id: string | null) => void
}

export const usePromptUiStore = create<PromptUiState>((set) => ({
  nav: 'all',
  search: '',
  activeTag: null,
  selectedPromptId: null,
  setNav: (nav) => set({ nav }),
  setSearch: (search) => set({ search }),
  setActiveTag: (activeTag) => set({ activeTag }),
  setSelectedPromptId: (selectedPromptId) => set({ selectedPromptId })
}))
