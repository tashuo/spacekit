import { useEffect, useMemo, useRef, useState } from 'react'
import { TOOLS, searchTools, findTool } from '@/lib/tools/registry'
import { CAT_LABEL } from '@/lib/tools/categories'
import { usePrefs } from '@/lib/store/prefs'
import { SearchIcon, StarIcon, StarFilledIcon, ClockIcon, ReturnIcon } from '@/components/icons'
import type { ToolCategory, ToolDef } from '@/lib/tools/types'

// 分类色点：在极简列表里快速区分工具类别（替代每项一个图标）
const CAT_DOT: Record<ToolCategory, string> = {
  json: 'bg-amber-400',
  convert: 'bg-sky-400',
  codec: 'bg-violet-400',
  timestamp: 'bg-emerald-400',
  crypto: 'bg-rose-400',
  text: 'bg-teal-400',
}

type IconCmp = (p: { className?: string }) => React.ReactElement
interface Group {
  key: string
  label: string
  Icon?: IconCmp
  dot?: string // 分类组用色点替代图标
  tools: ToolDef[]
}

export function CommandPalette({
  onSelect,
  onClose,
  autoFocus = true,
}: {
  onSelect: (id: string) => void
  onClose?: () => void
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const favoriteToolIds = usePrefs((s) => s.favoriteToolIds)
  const recentToolIds = usePrefs((s) => s.recentToolIds)
  const toggleFavorite = usePrefs((s) => s.toggleFavorite)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 无搜索时按 收藏 / 最近 / 全部 分组（去重）；有搜索时单一结果列表
  const groups = useMemo<Group[]>(() => {
    const q = query.trim()
    if (q) return [{ key: 'results', label: '结果', Icon: SearchIcon, tools: searchTools(q) }]
    const favs = favoriteToolIds.map((id) => findTool(id)).filter((t): t is ToolDef => !!t)
    const favSet = new Set(favs.map((t) => t.id))
    const recents = recentToolIds
      .map((id) => findTool(id))
      .filter((t): t is ToolDef => !!t && !favSet.has(t.id))
    const used = new Set([...favSet, ...recents.map((t) => t.id)])
    const all = TOOLS.filter((t) => !used.has(t.id))
    const out: Group[] = []
    if (favs.length) out.push({ key: 'fav', label: '收藏', Icon: StarFilledIcon, tools: favs })
    if (recents.length) out.push({ key: 'recent', label: '最近', Icon: ClockIcon, tools: recents })
    // 「全部」按分类聚合（分类顺序取自 CAT_LABEL 的定义顺序）
    for (const cat of Object.keys(CAT_LABEL) as ToolCategory[]) {
      const tools = all.filter((t) => t.category === cat)
      if (tools.length) out.push({ key: cat, label: CAT_LABEL[cat], dot: CAT_DOT[cat], tools })
    }
    return out
  }, [query, favoriteToolIds, recentToolIds])

  const flat = useMemo(() => groups.flatMap((g) => g.tools), [groups])
  const indexById = useMemo(() => {
    const m = new Map<string, number>()
    flat.forEach((t, i) => m.set(t.id, i))
    return m
  }, [flat])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const t = flat[active]
      if (t) onSelect(t.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose?.()
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      const t = flat[active]
      if (t) toggleFavorite(t.id)
    }
  }

  return (
    <div className="flex max-h-[70vh] w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 dark:border-zinc-800">
        <SearchIcon className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="搜索工具…"
          aria-label="搜索工具"
          role="combobox"
          aria-expanded="true"
          aria-controls="ck-list"
          spellCheck={false}
          className="h-12 flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="cursor-pointer text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            清除
          </button>
        )}
      </div>

      <div ref={listRef} id="ck-list" role="listbox" className="flex-1 overflow-auto p-2">
        {flat.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-zinc-400">未找到匹配工具</div>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="mb-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {g.Icon ? (
                  <g.Icon className="h-3 w-3" />
                ) : g.dot ? (
                  <span className={`h-1.5 w-1.5 rounded-full ${g.dot}`} />
                ) : null}
                {g.label}
              </div>
              {g.tools.map((t) => {
                const idx = indexById.get(t.id) ?? -1
                const isActive = idx === active
                const fav = favoriteToolIds.includes(t.id)
                return (
                  <div
                    key={t.id}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onClick={() => onSelect(t.id)}
                    onMouseMove={() => setActive(idx)}
                    className={`group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                      isActive ? 'bg-teal-50 dark:bg-teal-500/10' : ''
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${CAT_DOT[t.category]}`} />
                    <span
                      className={`flex-1 truncate text-sm ${
                        isActive ? 'font-medium text-teal-700 dark:text-teal-300' : 'text-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      {t.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-400">{CAT_LABEL[t.category]}</span>
                    <button
                      type="button"
                      aria-label={fav ? '取消收藏' : '收藏'}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(t.id)
                      }}
                      className={`shrink-0 cursor-pointer rounded p-0.5 transition-colors ${
                        fav
                          ? 'text-amber-400'
                          : 'text-zinc-300 opacity-0 hover:text-amber-400 group-hover:opacity-100 dark:text-zinc-600'
                      }`}
                    >
                      {fav ? <StarFilledIcon className="h-3.5 w-3.5" /> : <StarIcon className="h-3.5 w-3.5" />}
                    </button>
                    <ReturnIcon className={`h-3.5 w-3.5 shrink-0 text-teal-500 ${isActive ? '' : 'invisible'}`} />
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
        <Hint keys="↑↓" label="选择" />
        <Hint keys="⏎" label="打开" />
        <Hint keys="⌘D" label="收藏" />
        <div className="flex-1" />
        <Hint keys="esc" label="关闭" />
      </div>
    </div>
  )
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        {keys}
      </kbd>
      {label}
    </span>
  )
}
