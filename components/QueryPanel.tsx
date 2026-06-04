import { useMemo, useState } from 'react'
import { Editor } from './Editor'
import { queryJsonPath } from '@/lib/tools/jsonpath'
import { AlertIcon, CheckIcon, CopyIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'
import { useHistory } from '@/lib/store/history'
import type { ToolDef } from '@/lib/tools/types'

function PaneHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
    </div>
  )
}

export function QueryPanel({ tool }: { tool: ToolDef }) {
  const t = useT()
  const addHistory = useHistory((s) => s.add)
  const [json, setJson] = useState('')
  const [path, setPath] = useState('$')
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => queryJsonPath(json, path), [json, path])
  const hasJson = json.trim().length > 0

  function copy() {
    if (!result.ok || !result.output) return
    void navigator.clipboard.writeText(result.output)
    addHistory({ kind: 'tool', toolId: tool.id, value: result.output, input: json })
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section aria-label={t(`tool.${tool.id}`)} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
        <span className="shrink-0 font-mono text-xs text-zinc-400">JSONPath</span>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="$.store.book[*].author"
          spellCheck={false}
          aria-label={t('query.exprAria')}
          className="ck-input flex-1 px-3 py-1.5 font-mono text-sm"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-w-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <PaneHeader label="JSON" />
          <div className="min-h-0 flex-1">
            <Editor value={json} onChange={setJson} language="json" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <PaneHeader label={t('query.result')}>
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
            <Editor value={result.ok ? result.output : ''} readOnly language="json" />
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex h-9 shrink-0 items-center border-t border-zinc-200 px-4 text-xs dark:border-zinc-800">
        {!hasJson ? (
          <span className="text-zinc-400">{t('query.autoQuery')}</span>
        ) : result.ok ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="h-3.5 w-3.5" />
            {t('query.done')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertIcon className="h-3.5 w-3.5" />
            {result.error?.message}
          </span>
        )}
      </div>
    </section>
  )
}
