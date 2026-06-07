import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { overlayTools, guessOverlayTool } from '@/lib/tools/overlay'
import { useT } from '@/lib/i18n'
import { usePrefs } from '@/lib/store/prefs'
import { XIcon } from '@/components/icons'
import type { OverlayMessage } from '@/lib/messaging'
import type { ToolResult } from '@/lib/tools/types'

const TOOLS = overlayTools()
type Mode = 'hidden' | 'button' | 'panel'
interface Anchor {
  cx: number // 选区水平中心
  top: number // 选区顶部（视口坐标）
  bottom: number // 选区底部
}

export function Overlay() {
  const t = useT()
  const themePref = usePrefs((s) => s.theme)
  const dark = themePref === 'dark' || (themePref === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches)
  const [mode, setMode] = useState<Mode>('hidden')
  const [anchor, setAnchor] = useState<Anchor>({ cx: 0, top: 0, bottom: 0 })
  const [coords, setCoords] = useState({ left: 0, top: 0 })
  const [text, setText] = useState('')
  const [toolId, setToolId] = useState(TOOLS[0]?.id ?? '')
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 挂载时同步用户偏好（语言 / 主题）
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

  // 切换工具 / 文本时重置复制态
  useEffect(() => setCopied(false), [toolId, text])

  // 测量后把浮层夹取进视口；空间不足时翻到选区上方（layout effect 在绘制前完成，无跳动）
  useLayoutEffect(() => {
    if (mode === 'hidden' || !rootRef.current) return
    const { width: w, height: h } = rootRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const M = 8
    const left = Math.min(Math.max(anchor.cx - w / 2, M), Math.max(M, vw - w - M))
    const below = anchor.bottom + M
    let top: number
    if (below + h <= vh - M) top = below
    else if (anchor.top - h - M >= M) top = anchor.top - h - M
    else top = Math.min(Math.max(below, M), Math.max(M, vh - h - M))
    setCoords({ left, top })
  }, [mode, anchor, toolId, text, result])

  // 鼠标抬起：若有选中文本且不在浮层内，显示选区按钮（并按内容智能预选工具）
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (rootRef.current && e.composedPath().includes(rootRef.current)) return
      const sel = window.getSelection()
      const value = sel?.toString().trim() ?? ''
      if (!value || !sel || sel.rangeCount === 0) {
        setMode((m) => (m === 'panel' ? m : 'hidden'))
        return
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setText(value)
      setToolId(guessOverlayTool(value))
      setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom })
      setMode('button')
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  // 右键菜单 / 快捷键
  useEffect(() => {
    function onMessage(msg: OverlayMessage) {
      const centerAnchor = () => setAnchor({ cx: window.innerWidth / 2, top: 72, bottom: 72 })
      if (msg.type === 'run-tool') {
        const value = msg.text.trim()
        setText(value)
        // 右键菜单已指明工具则尊重，否则按内容智能预选
        setToolId(msg.toolId || guessOverlayTool(value))
        centerAnchor()
        setMode('panel')
      } else if (msg.type === 'toggle-overlay') {
        const value = window.getSelection()?.toString().trim() ?? ''
        if (!value) return
        setText(value)
        setToolId(guessOverlayTool(value))
        centerAnchor()
        setMode('panel')
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  // 面板模式下点击外部关闭；任意模式下 Esc 关闭
  useEffect(() => {
    if (mode === 'hidden') return
    function onDown(e: MouseEvent) {
      if (mode === 'panel' && rootRef.current && !e.composedPath().includes(rootRef.current)) setMode('hidden')
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMode('hidden')
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [mode])

  function copy() {
    if (!result.output) return
    void navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function openInApp() {
    chrome.runtime.sendMessage({ type: 'open-app', toolId, text })
    setMode('hidden')
  }

  function openInWeb() {
    chrome.runtime.sendMessage({ type: 'open-web', toolId, text })
    setMode('hidden')
  }

  if (mode === 'hidden' || TOOLS.length === 0) return null

  return (
    <div ref={rootRef} className={dark ? 'dark' : undefined} style={{ position: 'fixed', left: coords.left, top: coords.top, zIndex: 2147483647 }}>
      {mode === 'button' ? (
        <button
          type="button"
          onClick={() => setMode('panel')}
          className="flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-teal-700"
        >
          SpaceKit
        </button>
      ) : (
        <div className="w-96 overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">SpaceKit</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setMode('hidden')}
              className="cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label={t('overlay.close')}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 px-3 py-2">
            {TOOLS.map((toolItem) => (
              <button
                key={toolItem.id}
                type="button"
                onClick={() => setToolId(toolItem.id)}
                className={`cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  toolItem.id === toolId
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {t(`tool.${toolItem.id}`)}
              </button>
            ))}
          </div>
          <pre
            className={`mx-3 max-h-60 overflow-auto rounded border border-zinc-100 bg-zinc-50 p-2 font-mono text-xs break-all whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-950 ${
              result.ok ? 'text-zinc-800 dark:text-zinc-200' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {result.ok ? result.output || t('overlay.noOutput') : `✗ ${result.error?.message ?? t('overlay.fail')}`}
          </pre>
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={copy}
              disabled={!result.ok || !result.output}
              className="cursor-pointer rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {copied ? t('action.copied') : t('action.copy')}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={openInWeb}
              className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {t('overlay.openWeb')}
            </button>
            <button
              type="button"
              onClick={openInApp}
              className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-teal-600 transition-colors hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
            >
              {t('overlay.openApp')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
