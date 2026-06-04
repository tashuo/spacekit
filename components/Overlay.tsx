import { useEffect, useRef, useState } from 'react'
import { overlayTools } from '@/lib/tools/overlay'
import { useT } from '@/lib/i18n'
import { usePrefs } from '@/lib/store/prefs'
import type { OverlayMessage } from '@/lib/messaging'
import type { ToolResult } from '@/lib/tools/types'

const TOOLS = overlayTools()
type Mode = 'hidden' | 'button' | 'panel'

export function Overlay() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('hidden')
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [text, setText] = useState('')
  const [toolId, setToolId] = useState(TOOLS[0]?.id ?? '')
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 挂载时同步用户所选语言
  useEffect(() => {
    void usePrefs.getState().hydrate()
  }, [])

  const tool = TOOLS.find((t) => t.id === toolId)
  const [result, setResult] = useState<ToolResult>({ ok: true, output: '' })
  // 浮层仅暴露轻量同步工具，但 run 类型为同步|异步联合，统一兼容处理。
  useEffect(() => {
    if (!tool?.run) {
      setResult({ ok: true, output: '' })
      return
    }
    let alive = true
    const r = tool.run(text)
    if (r instanceof Promise) {
      void r.then((res) => {
        if (alive) setResult(res)
      })
    } else {
      setResult(r)
    }
    return () => {
      alive = false
    }
  }, [tool, text])

  // 鼠标抬起：若有选中文本且不在浮层内，显示选区按钮
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (rootRef.current && e.composedPath().includes(rootRef.current)) return
      const sel = window.getSelection()
      const value = sel?.toString().trim() ?? ''
      if (!value || !sel || sel.rangeCount === 0) {
        // 无选区时，保持已展开的面板（面板靠外部 mousedown 关闭，见下方 effect）；
        // 仅收起「选区按钮」态。
        setMode((m) => (m === 'panel' ? m : 'hidden'))
        return
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setText(value)
      setToolId((id) => id || TOOLS[0]?.id || '')
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 })
      setMode('button')
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  // 右键菜单 / 快捷键
  useEffect(() => {
    function onMessage(msg: OverlayMessage) {
      if (msg.type === 'run-tool') {
        setText(msg.text.trim())
        if (msg.toolId) setToolId(msg.toolId)
        setPos({ x: window.innerWidth / 2 - 190, y: 72 })
        setMode('panel')
      } else if (msg.type === 'toggle-overlay') {
        const value = window.getSelection()?.toString().trim() ?? ''
        if (!value) return
        setText(value)
        setPos({ x: window.innerWidth / 2 - 190, y: 72 })
        setMode('panel')
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  // 面板模式下点击外部关闭。在页面别处重新划词时，mousedown 先收起面板，
  // 紧接着的 mouseup 会检测到新选区并切到「选区按钮」态——重新划词即重置。
  useEffect(() => {
    if (mode !== 'panel') return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setMode('hidden')
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [mode])

  function copy() {
    if (!result.output) return
    void navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (mode === 'hidden' || TOOLS.length === 0) return null

  return (
    <div
      ref={rootRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2147483647, transform: mode === 'button' ? 'translateX(-50%)' : 'none' }}
    >
      {mode === 'button' ? (
        <button
          type="button"
          onClick={() => setMode('panel')}
          className="flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg hover:bg-teal-700"
        >
          SpaceKit
        </button>
      ) : (
        <div className="w-96 overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
            <span className="text-xs font-semibold text-teal-600">SpaceKit</span>
            <div className="flex-1" />
            <button type="button" onClick={() => setMode('hidden')} className="text-zinc-400 hover:text-zinc-700" aria-label={t('overlay.close')}>✕</button>
          </div>
          <div className="flex flex-wrap gap-1 px-3 py-2">
            {TOOLS.map((toolItem) => (
              <button
                key={toolItem.id}
                type="button"
                onClick={() => setToolId(toolItem.id)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  toolItem.id === toolId ? 'bg-teal-50 text-teal-700' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {t(`tool.${toolItem.id}`)}
              </button>
            ))}
          </div>
          <pre className={`mx-3 max-h-60 overflow-auto rounded border border-zinc-100 bg-zinc-50 p-2 font-mono text-xs whitespace-pre-wrap break-all ${result.ok ? 'text-zinc-800' : 'text-rose-600'}`}>
            {result.ok ? result.output || t('overlay.noOutput') : `✗ ${result.error?.message ?? t('overlay.fail')}`}
          </pre>
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={copy}
              disabled={!result.ok || !result.output}
              className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            >
              {copied ? t('action.copied') : t('action.copy')}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => chrome.runtime.sendMessage({ type: 'open-app' })}
              className="rounded px-2 py-1 text-[11px] font-medium text-teal-600 hover:bg-teal-50"
            >
              {t('overlay.openApp')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
