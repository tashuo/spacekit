import { create } from 'zustand'
import { kv } from './kv'

// 历史条目：纯本地存储，绝不外发。可一键清空。
export interface HistoryEntry {
  id: string
  kind: 'password' | 'tool'
  toolId: string
  value: string // 输出（password: 生成的密码）
  input?: string // tool: 原始输入
  ts: number
}

const KEY = 'spacekit:history'
const MAX = 50

interface HistoryState {
  enabled: boolean
  entries: HistoryEntry[]
  add: (e: { kind: HistoryEntry['kind']; toolId: string; value: string; input?: string }) => void
  remove: (id: string) => void
  removeByTool: (toolId: string) => void
  clear: () => void
  setEnabled: (b: boolean) => void
  importMerge: (h: { enabled: boolean; entries: HistoryEntry[] }) => void
  hydrate: () => Promise<void>
}

async function persist(s: { enabled: boolean; entries: HistoryEntry[] }) {
  await kv.set(KEY, { enabled: s.enabled, entries: s.entries })
}

export const useHistory = create<HistoryState>((set, get) => ({
  enabled: true,
  entries: [],
  add: ({ kind, toolId, value, input }) => {
    if (!get().enabled || !value) return
    const entry: HistoryEntry = { id: crypto.randomUUID(), kind, toolId, value, input, ts: Date.now() }
    const entries = [entry, ...get().entries].slice(0, MAX)
    set({ entries })
    void persist({ ...get(), entries })
  },
  remove: (id) => {
    const entries = get().entries.filter((e) => e.id !== id)
    set({ entries })
    void persist({ ...get(), entries })
  },
  removeByTool: (toolId) => {
    const entries = get().entries.filter((e) => e.toolId !== toolId)
    set({ entries })
    void persist({ ...get(), entries })
  },
  clear: () => {
    set({ entries: [] })
    void persist({ ...get(), entries: [] })
  },
  setEnabled: (enabled) => {
    set({ enabled })
    void persist({ ...get(), enabled })
  },
  importMerge: (h) => {
    const cur = get().entries
    const seen = new Set(cur.map((e) => e.id))
    const entries = [...cur, ...h.entries.filter((e) => !seen.has(e.id))]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX)
    const next = { enabled: h.enabled, entries }
    set(next)
    void persist(next)
  },
  hydrate: async () => {
    const h = await kv.get<{ enabled?: boolean; entries?: HistoryEntry[] }>(KEY)
    if (h) set({ enabled: h.enabled ?? true, entries: h.entries ?? [] })
  },
}))
