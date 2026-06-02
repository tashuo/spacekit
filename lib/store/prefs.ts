import { create } from 'zustand'

export type Theme = 'system' | 'light' | 'dark'

interface PrefsState {
  lastToolId: string
  theme: Theme
  tz: string // 'UTC' | 'local'
  setLastTool: (id: string) => void
  setTheme: (t: Theme) => void
  setTz: (tz: string) => void
  hydrate: () => Promise<void>
}

const KEY = 'spacekit:prefs'

async function persist(p: { lastToolId: string; theme: Theme; tz: string }) {
  await chrome.storage?.local.set({ [KEY]: { lastToolId: p.lastToolId, theme: p.theme, tz: p.tz } })
}

export const usePrefs = create<PrefsState>((set, get) => ({
  lastToolId: 'json-format',
  theme: 'system',
  tz: 'UTC',
  setLastTool: (id) => { set({ lastToolId: id }); void persist({ ...get(), lastToolId: id }) },
  setTheme: (t) => { set({ theme: t }); void persist({ ...get(), theme: t }) },
  setTz: (tz) => { set({ tz }); void persist({ ...get(), tz }) },
  hydrate: async () => {
    const stored = await chrome.storage?.local.get(KEY)
    const p = stored?.[KEY] as { lastToolId: string; theme: Theme; tz: string } | undefined
    if (p) set({ lastToolId: p.lastToolId, theme: p.theme, tz: p.tz })
  },
}))
