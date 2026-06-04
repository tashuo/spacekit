import { useEffect, useMemo, useState } from 'react'
import { Editor } from './Editor'
import { AlertIcon, CheckIcon, CopyIcon, TrashIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'
import type { ToolDef } from '@/lib/tools/types'

function PaneHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </div>
  )
}

export function ToolPanel({ tool }: { tool: ToolDef }) {
  const t = useT()
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)

  // 切换工具时清空输入
  useEffect(() => {
    setInput('')
    setCopied(false)
  }, [tool.id])

  // 实时转换：输入变化即出结果
  const result = useMemo(() => (tool.run ? tool.run(input) : { ok: true, output: '' }), [tool, input])
  const lang = tool.category === 'json' ? 'json' : 'text'
  const hasInput = input.trim().length > 0

  function copy() {
    if (!result.output) return
    void navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section aria-label={tool.name} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      {/* 双栏 */}
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-w-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <PaneHeader label={t('pane.input')}>
            <button
              type="button"
              onClick={() => setInput('')}
              disabled={!hasInput}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-rose-400"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {t('action.clear')}
            </button>
          </PaneHeader>
          <div className="min-h-0 flex-1">
            <Editor value={input} onChange={setInput} language={lang} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <PaneHeader label={t('pane.output')}>
            <button
              type="button"
              onClick={copy}
              disabled={!result.ok || !result.output}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                copied
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400'
              }`}
            >
              {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
              {copied ? t('action.copied') : t('action.copy')}
            </button>
          </PaneHeader>
          <div className="min-h-0 flex-1">
            <Editor value={result.ok ? result.output : ''} readOnly language={lang} />
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div aria-live="polite" className="flex h-9 shrink-0 items-center border-t border-zinc-200 px-4 text-xs dark:border-zinc-800">
        {!hasInput ? (
          <span className="text-zinc-400">{t('status.autoConvert')}</span>
        ) : result.ok ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="h-3.5 w-3.5" />
            {t('status.valid')}
            <span className="text-zinc-400">· {t('status.chars', { n: result.output.length })}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertIcon className="h-3.5 w-3.5" />
            {result.error?.message}
            {result.error?.line ? (
              <span className="text-zinc-400">
                · {t('status.lineCol', { line: result.error.line, col: result.error.column ?? 0 })}
              </span>
            ) : null}
          </span>
        )}
      </div>
    </section>
  )
}
