import { useEffect, useMemo, useRef, useState } from 'react'
import { TOOLS, searchTools, findTool } from '@/lib/tools/registry'
import { usePrefs } from '@/lib/store/prefs'
import { useT } from '@/lib/i18n'
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
  format: 'bg-fuchsia-400',
}

// All categories in display order (matches original CAT_LABEL key order)
const CAT_KEYS: ToolCategory[] = ['json', 'convert', 'format', 'codec', 'timestamp', 'crypto', 'text']

type IconCmp = (p: { className?: string }) => React.ReactElement
interface Group {
  key: string
  labelKey: string
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
  const t = useT()
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
    if (q) return [{ key: 'results', labelKey: 'group.results', Icon: SearchIcon, tools: searchTools(q) }]
    const favs = favoriteToolIds.map((id) => findTool(id)).filter((t): t is ToolDef => !!t)
    const favSet = new Set(favs.map((t) => t.id))
    const recents = recentToolIds
      .map((id) => findTool(id))
      .filter((t): t is ToolDef => !!t && !favSet.has(t.id))
    const out: Group[] = []
    if (favs.length) out.push({ key: 'fav', labelKey: 'group.fav', Icon: StarFilledIcon, tools: favs })
    if (recents.length) out.push({ key: 'recent', labelKey: 'group.recent', Icon: ClockIcon, tools: recents })
    // 各分类展示全量工具（与收藏/最近快捷区可重复出现）
    for (const cat of CAT_KEYS) {
      const tools = TOOLS.filter((t) => t.category === cat)
      if (tools.length) out.push({ key: cat, labelKey: `cat.${cat}`, dot: CAT_DOT[cat], tools })
    }
    return out
  }, [query, favoriteToolIds, recentToolIds])

  // 给每个可见项分配全局位置索引（同一工具可在多个分组重复出现）
  const positioned = useMemo(() => {
    let i = 0
    return groups.map((g) => ({ ...g, items: g.tools.map((tool) => ({ tool, index: i++ })) }))
  }, [groups])
  const flatItems = useMemo(() => positioned.flatMap((g) => g.items), [positioned])

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
      setActive((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const tool = flatItems[active]?.tool
      if (tool) onSelect(tool.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose?.()
    } else if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      const tool = flatItems[active]?.tool
      if (tool) toggleFavorite(tool.id)
    }
  }

  function renderOption(toolItem: ToolDef, index: number, groupKey: string) {
    const isActive = index === active
    const fav = favoriteToolIds.includes(toolItem.id)
    return (
      <div
        key={`${groupKey}-${toolItem.id}`}
        role="option"
        aria-selected={isActive}
        data-active={isActive}
        onClick={() => onSelect(toolItem.id)}
        onMouseMove={() => setActive(index)}
        className={`group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
          isActive ? 'bg-teal-50 dark:bg-teal-500/10' : ''
        }`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${CAT_DOT[toolItem.category]}`} />
        <span
          className={`flex-1 truncate text-sm ${
            isActive ? 'font-medium text-teal-700 dark:text-teal-300' : 'text-zinc-700 dark:text-zinc-200'
          }`}
        >
          {t(`tool.${toolItem.id}`)}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-zinc-400">{t(`cat.${toolItem.category}`)}</span>
        <button
          type="button"
          aria-label={fav ? t('fav.remove') : t('fav.add')}
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(toolItem.id)
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
  }

  // 渲染一个分组内的所有项；分类组(g.dot)内按 subgroup 插入二级小标题
  function renderGroupItems(g: (typeof positioned)[number]) {
    if (!g.dot) return g.items.map(({ tool, index }) => renderOption(tool, index, g.key))
    const rows: React.ReactNode[] = []
    let lastSub: string | undefined
    for (const { tool, index } of g.items) {
      if (tool.subgroup && tool.subgroup !== lastSub) {
        lastSub = tool.subgroup
        rows.push(
          <div
            key={`sub-${g.key}-${tool.subgroup}`}
            className="px-2 pt-2 pb-0.5 pl-4 text-[10px] font-medium uppercase tracking-wide text-zinc-300 dark:text-zinc-600"
          >
            {t(`subgroup.${tool.subgroup}`)}
          </div>,
        )
      }
      rows.push(renderOption(tool, index, g.key))
    }
    return rows
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
          placeholder={t('palette.placeholder')}
          aria-label={t('palette.placeholder')}
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
            {t('palette.clear')}
          </button>
        )}
      </div>

      <div ref={listRef} id="ck-list" role="listbox" className="flex-1 overflow-auto p-2">
        {flatItems.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-zinc-400">{t('palette.empty')}</div>
        ) : (
          positioned.map((g) => (
            <div key={g.key} className="mb-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {g.Icon ? (
                  <g.Icon className="h-3 w-3" />
                ) : g.dot ? (
                  <span className={`h-1.5 w-1.5 rounded-full ${g.dot}`} />
                ) : null}
                {t(g.labelKey)}
              </div>
              {renderGroupItems(g)}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
        <Hint keys="↑↓" label={t('hint.select')} />
        <Hint keys="⏎" label={t('hint.open')} />
        <Hint keys="⌘D" label={t('hint.favorite')} />
        <div className="flex-1" />
        <Hint keys="esc" label={t('hint.close')} />
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
