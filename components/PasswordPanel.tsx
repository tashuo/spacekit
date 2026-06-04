import { useEffect, useState } from 'react'
import { generateRandom, generateMemorable, generatePin, estimateStrength, type StrengthLabel } from '@/lib/tools/password'
import { useT } from '@/lib/i18n'
import { CopyIcon, CheckIcon, RefreshIcon, TrashIcon } from '@/components/icons'
import { useHistory } from '@/lib/store/history'
import type { ToolDef } from '@/lib/tools/types'

type PwType = 'random' | 'memorable' | 'pin'

const STRENGTH_COLOR: Record<StrengthLabel, string> = {
  weak: 'bg-rose-500',
  fair: 'bg-amber-500',
  strong: 'bg-teal-500',
  excellent: 'bg-emerald-500',
}

// 字符着色：数字青、符号红、字母默认
function Colored({ value }: { value: string }) {
  return (
    <>
      {[...value].map((ch, i) => {
        const cls = /[0-9]/.test(ch)
          ? 'text-teal-600 dark:text-teal-400'
          : /[a-zA-Z]/.test(ch)
            ? 'text-zinc-800 dark:text-zinc-100'
            : 'text-rose-500 dark:text-rose-400'
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        )
      })}
    </>
  )
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-zinc-600 dark:text-zinc-300">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 cursor-pointer accent-teal-600"
      />
      <span className="w-8 shrink-0 text-right font-mono text-sm text-zinc-700 dark:text-zinc-200">{value}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-teal-600" />
      {label}
    </label>
  )
}

export function PasswordPanel({ tool }: { tool: ToolDef }) {
  const t = useT()
  const [type, setType] = useState<PwType>('random')
  const [length, setLength] = useState(16)
  const [lower, setLower] = useState(true)
  const [upper, setUpper] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(false)
  const [words, setWords] = useState(4)
  const [separator, setSeparator] = useState('-')
  const [capitalize, setCapitalize] = useState(true)
  const [includeNumber, setIncludeNumber] = useState(true)
  const [pinLength, setPinLength] = useState(6)
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const addHistory = useHistory((s) => s.add)
  const removeHistory = useHistory((s) => s.remove)
  const recent = useHistory((s) => s.entries).filter((e) => e.kind === 'password').slice(0, 6)

  function generate() {
    if (type === 'random') {
      setPassword(generateRandom({ length, lower, upper, digits, symbols, avoidAmbiguous }))
    } else if (type === 'memorable') {
      setPassword(generateMemorable({ words, separator, capitalize, includeNumber }))
    } else {
      setPassword(generatePin(pinLength))
    }
  }

  // 任一选项变化即重新生成（generate 读取该次渲染的最新 state）
  useEffect(generate, [type, length, lower, upper, digits, symbols, avoidAmbiguous, words, separator, capitalize, includeNumber, pinLength])

  const strength = estimateStrength(password)
  const pct = Math.min(100, Math.round((strength.bits / 128) * 100))

  function copy() {
    if (!password) return
    void navigator.clipboard.writeText(password)
    addHistory({ kind: 'password', toolId: tool.id, value: password })
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const TYPES: PwType[] = ['random', 'memorable', 'pin']
  const noSet = !lower && !upper && !digits && !symbols

  return (
    <section aria-label={t(`tool.${tool.id}`)} className="flex min-w-0 flex-1 flex-col overflow-auto bg-white dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 p-6">
        {/* 类型切换 */}
        <div className="flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          {TYPES.map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => setType(ty)}
              aria-pressed={type === ty}
              className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                type === ty
                  ? 'bg-white text-teal-600 shadow-sm dark:bg-zinc-950 dark:text-teal-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t(`pw.type.${ty}`)}
            </button>
          ))}
        </div>

        {/* 结果 + 强度 */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-2">
            <div className="min-h-8 flex-1 break-all font-mono text-lg leading-relaxed">
              {password ? <Colored value={password} /> : <span className="text-zinc-400">—</span>}
            </div>
            <button
              type="button"
              onClick={generate}
              title={t('pw.regenerate')}
              aria-label={t('pw.regenerate')}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-zinc-800 dark:hover:text-teal-400"
            >
              <RefreshIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={copy}
              disabled={!password}
              title={t('action.copy')}
              aria-label={copied ? t('action.copied') : t('action.copy')}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-teal-400"
            >
              {copied ? <CheckIcon className="h-4 w-4 text-emerald-500" /> : <CopyIcon className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className={`h-full rounded-full transition-all ${STRENGTH_COLOR[strength.label]}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right text-xs text-zinc-500">{t(`pw.strength.${strength.label}`)}</span>
          </div>
        </div>

        {/* 选项 */}
        {type === 'random' && (
          <div className="flex flex-col gap-4">
            <Slider label={t('pw.length')} min={8} max={64} value={length} onChange={setLength} />
            <div className="grid grid-cols-2 gap-2">
              <Toggle label={t('pw.lower')} checked={lower} onChange={setLower} />
              <Toggle label={t('pw.upper')} checked={upper} onChange={setUpper} />
              <Toggle label={t('pw.digits')} checked={digits} onChange={setDigits} />
              <Toggle label={t('pw.symbols')} checked={symbols} onChange={setSymbols} />
              <Toggle label={t('pw.avoidAmbiguous')} checked={avoidAmbiguous} onChange={setAvoidAmbiguous} />
            </div>
            {noSet && <p className="text-xs text-rose-500">{t('pw.empty')}</p>}
          </div>
        )}

        {type === 'memorable' && (
          <div className="flex flex-col gap-4">
            <Slider label={t('pw.words')} min={3} max={8} value={words} onChange={setWords} />
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-zinc-600 dark:text-zinc-300">{t('pw.separator')}</span>
              <input
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                maxLength={3}
                aria-label={t('pw.separator')}
                className="ck-input w-20 px-2 py-1 text-center font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label={t('pw.capitalize')} checked={capitalize} onChange={setCapitalize} />
              <Toggle label={t('pw.includeNumber')} checked={includeNumber} onChange={setIncludeNumber} />
            </div>
          </div>
        )}

        {type === 'pin' && <Slider label={t('pw.length')} min={4} max={12} value={pinLength} onChange={setPinLength} />}

        {recent.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t('history.recent')}</span>
            {recent.map((e) => (
              <div key={e.id} className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <span className="flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">{e.value}</span>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(e.value)}
                  aria-label={t('action.copy')}
                  className="shrink-0 cursor-pointer text-zinc-400 transition-colors hover:text-teal-600 dark:hover:text-teal-400"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeHistory(e.id)}
                  aria-label={t('action.delete')}
                  className="shrink-0 cursor-pointer text-zinc-400 transition-colors hover:text-rose-500"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
