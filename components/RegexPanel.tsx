import { useMemo, useState } from 'react'
import { testRegex } from '@/lib/tools/regex'
import { useT } from '@/lib/i18n'
import type { ToolDef } from '@/lib/tools/types'

const FLAG_KEYS: { flag: string; key: string }[] = [
  { flag: 'g', key: 'regex.flag.g' },
  { flag: 'i', key: 'regex.flag.i' },
  { flag: 'm', key: 'regex.flag.m' },
  { flag: 's', key: 'regex.flag.s' },
]

export function RegexPanel({ tool }: { tool: ToolDef }) {
  const t = useT()
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')

  const result = useMemo(() => testRegex(pattern, flags, text), [pattern, flags, text])

  function toggleFlag(f: string) {
    setFlags((cur) => (cur.includes(f) ? cur.replace(f, '') : cur + f))
  }

  return (
    <section aria-label={t(`tool.${tool.id}`)} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400">/</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={t('regex.pattern')}
            spellCheck={false}
            className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="font-mono text-zinc-400">/{flags}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {FLAG_KEYS.map(({ flag, key }) => (
            <label key={flag} className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={flags.includes(flag)} onChange={() => toggleFlag(flag)} />
              {t(key)}
            </label>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('regex.testText')}
          spellCheck={false}
          className="min-h-32 flex-1 resize-none rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          {!result.ok ? (
            <span className="text-sm text-rose-600 dark:text-rose-400">✗ {result.error}</span>
          ) : (
            <>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {t('regex.matches', { n: result.matches.length })}
              </div>
              <ul className="space-y-1">
                {result.matches.map((m, i) => (
                  <li key={i} className="font-mono text-sm">
                    <span className="text-teal-600 dark:text-teal-400">{JSON.stringify(m.match)}</span>
                    <span className="text-zinc-400"> @ {m.index}</span>
                    {m.groups.length > 0 && (
                      <span className="text-zinc-500"> {t('regex.groups')}: {m.groups.map((g) => (g === undefined ? '∅' : JSON.stringify(g))).join(', ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
