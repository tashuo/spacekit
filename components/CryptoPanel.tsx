import { useMemo, useState } from 'react'
import { Editor } from './Editor'
import { symEncrypt, symDecrypt, sm4Encrypt, sm4Decrypt, type SymAlgo } from '@/lib/tools/crypto'
import { AlertIcon, CheckIcon, CopyIcon } from '@/components/icons'
import type { ToolDef, ToolResult } from '@/lib/tools/types'

type Mode = 'encrypt' | 'decrypt'

// 按工具 id 映射到算法实现与密钥提示
const ALGOS: Record<string, { enc: (t: string, k: string) => ToolResult; dec: (c: string, k: string) => ToolResult; keyHint: string }> = {
  aes: { enc: (t, k) => symEncrypt('AES', t, k), dec: (c, k) => symDecrypt('AES', c, k), keyHint: '密钥 / 密码短语' },
  des: { enc: (t, k) => symEncrypt('DES', t, k), dec: (c, k) => symDecrypt('DES', c, k), keyHint: '密钥 / 密码短语' },
  'triple-des': { enc: (t, k) => symEncrypt('TripleDES', t, k), dec: (c, k) => symDecrypt('TripleDES', c, k), keyHint: '密钥 / 密码短语' },
  sm4: { enc: sm4Encrypt, dec: sm4Decrypt, keyHint: '32 位十六进制密钥' },
}

export function CryptoPanel({ tool }: { tool: ToolDef }) {
  const algo = ALGOS[tool.id] ?? ALGOS.aes
  const [mode, setMode] = useState<Mode>('encrypt')
  const [input, setInput] = useState('')
  const [key, setKey] = useState('')
  const [copied, setCopied] = useState(false)

  const result = useMemo(
    () => (mode === 'encrypt' ? algo.enc(input, key) : algo.dec(input, key)),
    [algo, mode, input, key],
  )
  const hasInput = input.trim().length > 0

  function copy() {
    if (!result.output) return
    void navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section aria-label={tool.name} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200 px-3 dark:border-zinc-800">
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          {(['encrypt', 'decrypt'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                mode === m ? 'bg-white text-teal-600 shadow-sm dark:bg-zinc-950 dark:text-teal-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {m === 'encrypt' ? '加密' : '解密'}
            </button>
          ))}
        </div>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={algo.keyHint}
          spellCheck={false}
          aria-label="密钥"
          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-w-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div className="flex h-8 shrink-0 items-center border-b border-zinc-200 bg-zinc-50/80 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
            {mode === 'encrypt' ? '明文' : '密文'}
          </div>
          <div className="min-h-0 flex-1">
            <Editor value={input} onChange={setInput} language="text" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{mode === 'encrypt' ? '密文' : '明文'}</span>
            <button
              type="button"
              onClick={copy}
              disabled={!result.ok || !result.output}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-teal-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-teal-400"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Editor value={result.ok ? result.output : ''} readOnly language="text" />
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex h-9 shrink-0 items-center border-t border-zinc-200 px-4 text-xs dark:border-zinc-800">
        {!hasInput ? (
          <span className="text-zinc-400">输入内容与密钥后自动{mode === 'encrypt' ? '加密' : '解密'}</span>
        ) : result.ok ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="h-3.5 w-3.5" />
            完成
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
