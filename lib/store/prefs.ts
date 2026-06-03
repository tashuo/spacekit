import { create } from 'zustand'

export type Theme = 'system' | 'light' | 'dark'

const RECENT_MAX = 6

interface PrefsState {
  theme: Theme
  tz: string // 'UTC' | 'local'
  recentToolIds: string[]
  favoriteToolIds: string[]
  setTheme: (t: Theme) => void
  setTz: (tz: string) => void
  pushRecent: (id: string) => void
  toggleFavorite: (id: string) => void
  hydrate: () => Promise<void>
}

const KEY = 'spacekit:prefs'

type Persisted = Pick<PrefsState, 'theme' | 'tz' | 'recentToolIds' | 'favoriteToolIds'>

async function persist(p: Persisted) {
  await chrome.storage?.local.set({
    [KEY]: {
      theme: p.theme,
      tz: p.tz,
      recentToolIds: p.recentToolIds,
      favoriteToolIds: p.favoriteToolIds,
    },
  })
}

export const usePrefs = create<PrefsState>((set, get) => ({
  // Dark-first：默认深色（用户仍可切到浅色/跟随系统）
  theme: 'dark',
  tz: 'UTC',
  recentToolIds: [],
  favoriteToolIds: [],
  setTheme: (t) => {
    set({ theme: t })
    void persist({ ...get(), theme: t })
  },
  setTz: (tz) => {
    set({ tz })
    void persist({ ...get(), tz })
  },
  // 最近使用：移到队首、去重、截断
  pushRecent: (id) => {
    const recentToolIds = [id, ...get().recentToolIds.filter((x) => x !== id)].slice(0, RECENT_MAX)
    set({ recentToolIds })
    void persist({ ...get(), recentToolIds })
  },
  toggleFavorite: (id) => {
    const cur = get().favoriteToolIds
    const favoriteToolIds = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    set({ favoriteToolIds })
    void persist({ ...get(), favoriteToolIds })
  },
  hydrate: async () => {
    const stored = await chrome.storage?.local.get(KEY)
    const p = stored?.[KEY] as Partial<Persisted> | undefined
    if (p) {
      set({
        theme: p.theme ?? 'dark',
        tz: p.tz ?? 'UTC',
        recentToolIds: p.recentToolIds ?? [],
        favoriteToolIds: p.favoriteToolIds ?? [],
      })
    }
  },
}))
