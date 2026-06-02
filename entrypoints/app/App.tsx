import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ToolPanel } from '@/components/ToolPanel'
import { findTool } from '@/lib/tools/registry'
import { usePrefs } from '@/lib/store/prefs'

export function App() {
  const { lastToolId, setLastTool, theme, setTheme, hydrate } = usePrefs()
  useEffect(() => { void hydrate() }, [])
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }, [theme])

  const tool = findTool(lastToolId) ?? findTool('json-format')!

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-3 px-4 py-2 border-b">
        <span className="font-semibold">SpaceKit</span>
        <div className="flex-1" />
        <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="text-sm border rounded px-1">
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </header>
      <div className="flex-1 flex min-h-0">
        <Sidebar activeId={tool.id} onSelect={setLastTool} />
        <ToolPanel tool={tool} />
      </div>
    </div>
  )
}
