import { useMemo, useState } from 'react'
import { Editor } from './Editor'
import { queryJsonPath } from '@/lib/tools/jsonpath'
import { AlertIcon, CheckIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'
import type { ToolDef } from '@/lib/tools/types'

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-b border-zinc-200 bg-zinc-50/80 px-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
    </div>
  )
}

export function QueryPanel({ tool }: { tool: ToolDef }) {
  const t = useT()
  const [json, setJson] = useState('')
  const [path, setPath] = useState('$')

  const result = useMemo(() => queryJsonPath(json, path), [json, path])
  const hasJson = json.trim().length > 0

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
          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
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
          <PaneHeader label={t('query.result')} />
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
