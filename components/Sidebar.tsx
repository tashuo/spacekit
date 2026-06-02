import { useState } from 'react'
import { searchTools } from '@/lib/tools/registry'
import { CAT_LABEL } from '@/lib/tools/categories'
import { SearchIcon } from '@/components/icons'

export function Sidebar({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const [q, setQ] = useState('')
  const list = searchTools(q)
  const cats = [...new Set(list.map((t) => t.category))]

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索工具…"
            aria-label="搜索工具"
            className="w-full rounded-lg border border-transparent bg-zinc-100 py-2 pl-8 pr-3 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-teal-500/50 focus:bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-950"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-auto px-2 pb-4">
        {cats.map((c) => (
          <div key={c}>
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {CAT_LABEL[c]}
            </div>
            <div className="space-y-0.5">
              {list
                .filter((t) => t.category === c)
                .map((t) => {
                  const active = t.id === activeId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelect(t.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex w-full cursor-pointer items-center rounded-md py-1.5 pl-3 pr-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-teal-50 font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
                          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-teal-500" />
                      )}
                      {t.name}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="px-3 pt-2 text-xs text-zinc-400">无匹配工具</div>
        )}
      </nav>
    </aside>
  )
}
