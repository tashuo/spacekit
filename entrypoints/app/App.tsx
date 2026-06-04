import { useEffect, useState } from 'react'
import { CommandPalette } from '@/components/CommandPalette'
import { ToolPanel } from '@/components/ToolPanel'
import { DiffPanel } from '@/components/DiffPanel'
import { RegexPanel } from '@/components/RegexPanel'
import { QueryPanel } from '@/components/QueryPanel'
import { CryptoPanel } from '@/components/CryptoPanel'
import { QrPanel } from '@/components/QrPanel'
import { findTool } from '@/lib/tools/registry'
import { CAT_LABEL } from '@/lib/tools/categories'
import { usePrefs, type Theme } from '@/lib/store/prefs'
import {
  ArrowLeftIcon,
  BracesIcon,
  CommandIcon,
  MonitorIcon,
  MoonIcon,
  StarFilledIcon,
  StarIcon,
  SunIcon,
} from '@/components/icons'
import type { ToolDef } from '@/lib/tools/types'

function ToolView({ tool }: { tool: ToolDef }) {
  switch (tool.layout) {
    case 'diff':
      return <DiffPanel tool={tool} />
    case 'regex':
      return <RegexPanel tool={tool} />
    case 'query':
      return <QueryPanel tool={tool} />
    case 'crypto':
      return <CryptoPanel tool={tool} />
    case 'qrcode':
      return <QrPanel tool={tool} />
    default:
      return <ToolPanel tool={tool} />
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'system', label: '跟随系统', Icon: MonitorIcon },
  { value: 'light', label: '浅色', Icon: SunIcon },
  { value: 'dark', label: '深色', Icon: MoonIcon },
]

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          className={`grid h-7 w-7 cursor-pointer place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
            theme === value
              ? 'bg-white text-teal-600 shadow-sm dark:bg-zinc-950 dark:text-teal-400'
              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm">
        <BracesIcon className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-none">
        <div className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">SpaceKit</div>
        <div className="mt-1 font-mono text-[11px] text-zinc-400">本地处理 · 零网络</div>
      </div>
    </div>
  )
}

export function App() {
  const theme = usePrefs((s) => s.theme)
  const setTheme = usePrefs((s) => s.setTheme)
  const hydrate = usePrefs((s) => s.hydrate)
  const pushRecent = usePrefs((s) => s.pushRecent)
  const favoriteToolIds = usePrefs((s) => s.favoriteToolIds)
  const toggleFavorite = usePrefs((s) => s.toggleFavorite)

  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [])
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // 键盘优先：⌘/Ctrl+K 在工具态唤起/收起命令面板浮层；Esc 关闭浮层
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        if (activeToolId) setPaletteOpen((v) => !v)
      } else if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeToolId, paletteOpen])

  function selectTool(id: string) {
    pushRecent(id)
    setActiveToolId(id)
    setPaletteOpen(false)
  }

  const tool = activeToolId ? findTool(activeToolId) : null

  // Launcher 态：命令面板为主视图（search-first）
  if (!tool) {
    return (
      <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-3 px-5 py-4">
          <Brand />
          <div className="flex-1" />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
        <div className="flex min-h-0 flex-1 justify-center px-5 pb-16">
          <div className="flex w-full max-w-2xl flex-col pt-[6vh]">
            <CommandPalette onSelect={selectTool} />
          </div>
        </div>
      </div>
    )
  }

  // Tool 态：精简顶栏 + 工具视图
  const fav = favoriteToolIds.includes(tool.id)
  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/70 px-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <button
          type="button"
          onClick={() => setActiveToolId(null)}
          aria-label="返回工具列表"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          工具
        </button>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
        <h1 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{tool.name}</h1>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {CAT_LABEL[tool.category]}
        </span>
        <button
          type="button"
          onClick={() => toggleFavorite(tool.id)}
          aria-label={fav ? '取消收藏' : '收藏'}
          aria-pressed={fav}
          title="收藏 (⌘D)"
          className={`cursor-pointer rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
            fav ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'
          }`}
        >
          {fav ? <StarFilledIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <CommandIcon className="h-3.5 w-3.5" />
          K
          <span className="text-zinc-400">搜索</span>
        </button>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <ToolView key={tool.id} tool={tool} />
      </main>

      {paletteOpen && (
        <div
          className="fixed inset-0 z-30 flex justify-center bg-black/40 px-5 pt-[10vh] backdrop-blur-sm"
          onClick={() => setPaletteOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CommandPalette onSelect={selectTool} onClose={() => setPaletteOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
