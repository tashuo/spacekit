import { z } from 'zod'
import { usePrefs } from './prefs'
import { useHistory } from './history'

export const PORTABLE_VERSION = 1

const HistoryEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(['password', 'tool']),
  toolId: z.string(),
  value: z.string(),
  input: z.string().optional(),
  ts: z.number(),
})

export const PortableSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  prefs: z.object({
    theme: z.enum(['system', 'light', 'dark']),
    lang: z.enum(['system', 'zh', 'en']),
    tz: z.string(),
    favoriteToolIds: z.array(z.string()),
    recentToolIds: z.array(z.string()),
  }),
  history: z.object({
    enabled: z.boolean(),
    entries: z.array(HistoryEntrySchema),
  }),
})
export type PortableState = z.infer<typeof PortableSchema>

// 读当前 store 状态，产出可移植快照
export function buildExport(): PortableState {
  const p = usePrefs.getState()
  const h = useHistory.getState()
  return {
    version: PORTABLE_VERSION,
    exportedAt: Date.now(),
    prefs: {
      theme: p.theme,
      lang: p.lang,
      tz: p.tz,
      favoriteToolIds: p.favoriteToolIds,
      recentToolIds: p.recentToolIds,
    },
    history: { enabled: h.enabled, entries: h.entries },
  }
}

// 校验 + 合并入库（非法输入抛错，不改任何 store）
export function applyImport(raw: unknown): void {
  const data = PortableSchema.parse(raw)
  usePrefs.getState().importMerge(data.prefs)
  useHistory.getState().importMerge(data.history)
}
