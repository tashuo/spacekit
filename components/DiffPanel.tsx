import { useEffect, useRef, useState } from 'react'
import { MergeView } from '@codemirror/merge'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { canonicalizeJson } from '@/lib/tools/diff'
import { useT } from '@/lib/i18n'
import type { ToolDef } from '@/lib/tools/types'

export function DiffPanel({ tool }: { tool: ToolDef }) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const mv = useRef<MergeView | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!host.current) return
    const exts = [basicSetup, EditorView.lineWrapping, json()]
    const view = new MergeView({
      a: { doc: '', extensions: exts },
      b: { doc: '', extensions: [...exts] },
      parent: host.current,
    })
    mv.current = view
    return () => view.destroy()
  }, [])

  // 读取两侧文本，各自规范化后写回；高亮差异由 MergeView 自动更新
  function canonicalizeBoth() {
    const view = mv.current
    if (!view) return
    let problem = ''
    for (const side of [view.a, view.b]) {
      const text = side.state.doc.toString()
      if (!text.trim()) continue
      const r = canonicalizeJson(text)
      if (r.ok) {
        side.dispatch({ changes: { from: 0, to: side.state.doc.length, insert: r.output } })
      } else {
        problem = r.error?.message ?? '非法 JSON'
      }
    }
    setMsg(problem ? `✗ ${problem}` : `✓ ${t('diff.done')}`)
  }

  return (
    <section aria-label={tool.name} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-9 shrink-0 items-center justify-end border-b border-zinc-200 px-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={canonicalizeBoth}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {t('diff.canonicalize')}
        </button>
      </div>
      <div ref={host} className="min-h-0 flex-1 overflow-auto text-sm [&_.cm-mergeView]:h-full [&_.cm-mergeViewEditors]:h-full" />
      <div className="flex h-9 shrink-0 items-center border-t border-zinc-200 px-4 text-xs text-zinc-400 dark:border-zinc-800">
        {msg || t('diff.hint')}
      </div>
    </section>
  )
}
