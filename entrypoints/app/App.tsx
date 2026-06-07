import { useEffect, useState } from 'react'
import { CommandPalette } from '@/components/CommandPalette'
import { ToolPanel } from '@/components/ToolPanel'
import { DiffPanel } from '@/components/DiffPanel'
import { RegexPanel } from '@/components/RegexPanel'
import { QueryPanel } from '@/components/QueryPanel'
import { CryptoPanel } from '@/components/CryptoPanel'
import { QrPanel } from '@/components/QrPanel'
import { PasswordPanel } from '@/components/PasswordPanel'
import { HistoryPanel } from '@/components/HistoryPanel'
import { findTool } from '@/lib/tools/registry'
import { usePrefs, type Theme } from '@/lib/store/prefs'
import { useHistory } from '@/lib/store/history'
import { kv } from '@/lib/store/kv'
import { decodeHandoff } from '@/lib/handoff'
import { useT } from '@/lib/i18n'
import type { LangPref } from '@/lib/i18n'
import { HANDOFF_KEY, type Handoff } from '@/lib/messaging'
import {
  ArrowLeftIcon,
  BracesIcon,
  ClockIcon,
  CommandIcon,
  GlobeIcon,
  MonitorIcon,
  MoonIcon,
  StarFilledIcon,
  StarIcon,
  SunIcon,
} from '@/components/icons'
import type { ToolDef } from '@/lib/tools/types'

function ToolView({ tool, initialInput }: { tool: ToolDef; initialInput?: string }) {
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
    case 'password':
      return <PasswordPanel tool={tool} />
    default:
      return <ToolPanel tool={tool} initialInput={initialInput} />
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const t = useT()
  const THEME_OPTIONS: { value: Theme; Icon: typeof SunIcon; key: string }[] = [
    { value: 'system', key: 'theme.system', Icon: MonitorIcon },
    { value: 'light', key: 'theme.light', Icon: SunIcon },
    { value: 'dark', key: 'theme.dark', Icon: MoonIcon },
  ]
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
      {THEME_OPTIONS.map(({ value, key, Icon }) => (
        <button
          key={value}
          type="button"
          title={t(key)}
          aria-label={t(key)}
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

function LangToggle() {
  const t = useT()
  const lang = usePrefs((s) => s.lang)
  const setLang = usePrefs((s) => s.setLang)
  const options: { value: LangPref; label: string }[] = [
    { value: 'system', label: t('lang.auto') },
    { value: 'zh', label: '中' },
    { value: 'en', label: 'EN' },
  ]
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
      <GlobeIcon className="mx-1 h-3.5 w-3.5 text-zinc-400" />
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => setLang(value)}
          className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
            lang === value
              ? 'bg-white text-teal-600 shadow-sm dark:bg-zinc-950 dark:text-teal-400'
              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function HistoryButton({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('history.open')}
      title={t('history.open')}
      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-500 transition-colors hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:text-teal-400"
    >
      <ClockIcon className="h-4 w-4" />
    </button>
  )
}

function Brand() {
  const t = useT()
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm">
        <BracesIcon className="h-[18px] w-[18px]" />
      </div>
      <div className="leading-none">
        <div className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">SpaceKit</div>
        <div className="mt-1 font-mono text-[11px] text-zinc-400">{t('app.tagline')}</div>
      </div>
    </div>
  )
}

export function App() {
  const t = useT()
  const theme = usePrefs((s) => s.theme)
  const setTheme = usePrefs((s) => s.setTheme)
  const hydrate = usePrefs((s) => s.hydrate)
  const hydrateHistory = useHistory((s) => s.hydrate)
  const pushRecent = usePrefs((s) => s.pushRecent)
  const favoriteToolIds = usePrefs((s) => s.favoriteToolIds)
  const toggleFavorite = usePrefs((s) => s.toggleFavorite)

  const [activeToolId, setActiveToolId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [handoff, setHandoff] = useState<Handoff | null>(null)

  useEffect(() => {
    void hydrate()
    void hydrateHistory()
    // 交接来源：① 网页深链 #t=..&x=..（优先）② 扩展内置页经 kv
    void (async () => {
      const fromHash = decodeHandoff(location.hash)
      if (fromHash && findTool(fromHash.toolId)) {
        setActiveToolId(fromHash.toolId)
        setHandoff(fromHash)
        pushRecent(fromHash.toolId)
        history.replaceState(null, '', location.pathname + location.search)
        return
      }
      const h = await kv.get<Handoff>(HANDOFF_KEY)
      if (h?.toolId && findTool(h.toolId)) {
        setActiveToolId(h.toolId)
        setHandoff(h)
        pushRecent(h.toolId)
        await kv.remove(HANDOFF_KEY)
      }
    })()
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
      } else if (e.key === 'Escape') {
        setPaletteOpen(false)
        setHistoryOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeToolId, paletteOpen])

  function selectTool(id: string) {
    pushRecent(id)
    setActiveToolId(id)
    setPaletteOpen(false)
    setHandoff(null) // 用户主动切换工具后不再复用交接文本
  }

  const tool = activeToolId ? findTool(activeToolId) : null

  // Launcher 态：命令面板为主视图（search-first）
  if (!tool) {
    return (
      <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-3 px-5 py-4">
          <Brand />
          <div className="flex-1" />
          <HistoryButton onClick={() => setHistoryOpen(true)} />
          <LangToggle />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
        <div className="flex min-h-0 flex-1 justify-center px-5 pb-16">
          <div className="flex w-full max-w-2xl flex-col pt-[6vh]">
            <CommandPalette onSelect={selectTool} />
          </div>
        </div>
        {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
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
          onClick={() => {
            setActiveToolId(null)
            setHandoff(null)
          }}
          aria-label={t('nav.back')}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('nav.tools')}
        </button>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
        <h1 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{t(`tool.${tool.id}`)}</h1>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {t(`cat.${tool.category}`)}
        </span>
        <button
          type="button"
          onClick={() => toggleFavorite(tool.id)}
          aria-label={fav ? t('fav.remove') : t('fav.add')}
          aria-pressed={fav}
          title={fav ? t('fav.remove') : t('fav.add')}
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
          <span className="text-zinc-400">{t('nav.search')}</span>
        </button>
        <HistoryButton onClick={() => setHistoryOpen(true)} />
        <LangToggle />
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <ToolView key={tool.id} tool={tool} initialInput={handoff && handoff.toolId === tool.id ? handoff.text : undefined} />
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
      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
    </div>
  )
}
