import { useMemo, useState } from 'react'
import { useHistory, type HistoryEntry } from '@/lib/store/history'
import { useT } from '@/lib/i18n'
import { CopyIcon, TrashIcon } from '@/components/icons'

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const entries = useHistory((s) => s.entries)
  const enabled = useHistory((s) => s.enabled)
  const setEnabled = useHistory((s) => s.setEnabled)
  const remove = useHistory((s) => s.remove)
  const removeByTool = useHistory((s) => s.removeByTool)
  const clear = useHistory((s) => s.clear)
  const [groupBy, setGroupBy] = useState<'tool' | 'time'>('tool')

  // 按工具分组：entries 已按时间倒序 → 组顺序为「最近活动优先」，组内为时间倒序
  const groups = useMemo(() => {
    const m = new Map<string, HistoryEntry[]>()
    for (const e of entries) {
      const arr = m.get(e.toolId)
      if (arr) arr.push(e)
      else m.set(e.toolId, [e])
    }
    return [...m.entries()]
  }, [entries])

  const renderRow = (e: HistoryEntry) => (
    <div key={e.id} className="group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          {groupBy === 'time' && <span className="font-medium text-zinc-500 dark:text-zinc-400">{t(`tool.${e.toolId}`)}</span>}
          <span>{new Date(e.ts).toLocaleString()}</span>
        </div>
        <div className="truncate font-mono text-sm text-zinc-700 dark:text-zinc-200">{e.value}</div>
      </div>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(e.value)}
        aria-label={t('action.copy')}
        className="shrink-0 cursor-pointer rounded p-1 text-zinc-400 opacity-0 transition-colors hover:text-teal-600 group-hover:opacity-100 dark:hover:text-teal-400"
      >
        <CopyIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => remove(e.id)}
        aria-label={t('action.delete')}
        className="shrink-0 cursor-pointer rounded p-1 text-zinc-400 opacity-0 transition-colors hover:text-rose-500 group-hover:opacity-100"
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-30 flex justify-center bg-black/40 px-5 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{t('history.title')}</span>
          <div className="flex gap-0.5 rounded-md border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {(['tool', 'time'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                aria-pressed={groupBy === g}
                className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  groupBy === g
                    ? 'bg-white text-teal-600 shadow-sm dark:bg-zinc-950 dark:text-teal-400'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {t(g === 'tool' ? 'history.byTool' : 'history.byTime')}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-teal-600" />
            {t('history.record')}
          </label>
          <button
            type="button"
            onClick={clear}
            disabled={!entries.length}
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('history.clear')}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {entries.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm text-zinc-400">{t('history.empty')}</div>
          ) : groupBy === 'time' ? (
            entries.map(renderRow)
          ) : (
            groups.map(([toolId, items]) => (
              <div key={toolId} className="group/tool mb-1">
                <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {t(`tool.${toolId}`)}
                  <span className="rounded-full bg-zinc-100 px-1.5 font-mono text-[10px] normal-case text-zinc-400 dark:bg-zinc-800">{items.length}</span>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => removeByTool(toolId)}
                    aria-label={t('history.clearTool')}
                    title={t('history.clearTool')}
                    className="shrink-0 cursor-pointer rounded p-1 text-zinc-400 opacity-0 transition-colors hover:text-rose-500 focus-visible:opacity-100 group-hover/tool:opacity-100"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {items.map(renderRow)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
