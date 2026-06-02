import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ToolPanel } from '@/components/ToolPanel'
import { findTool } from '@/lib/tools/registry'
import { usePrefs, type Theme } from '@/lib/store/prefs'
import { BracesIcon, MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'

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
          className={`grid h-7 w-7 cursor-pointer place-items-center rounded-md transition-colors ${
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

export function App() {
  const { lastToolId, setLastTool, theme, setTheme, hydrate } = usePrefs()

  useEffect(() => {
    void hydrate()
  }, [])
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const tool = findTool(lastToolId) ?? findTool('json-format')!

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/70 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm">
            <BracesIcon className="h-[18px] w-[18px]" />
          </div>
          <div className="leading-none">
            <div className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">SpaceKit</div>
            <div className="mt-1 font-mono text-[11px] text-zinc-400">本地处理 · 零网络</div>
          </div>
        </div>
        <div className="flex-1" />
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar activeId={tool.id} onSelect={setLastTool} />
        <ToolPanel tool={tool} />
      </div>
    </div>
  )
}
