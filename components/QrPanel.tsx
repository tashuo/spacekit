import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { generateQrSvg } from '@/lib/tools/qr'
import { CopyIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'
import type { ToolDef } from '@/lib/tools/types'

function Generate() {
  const t = useT()
  const [text, setText] = useState('')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    if (!text.trim()) {
      setSvg('')
      setError('')
      return
    }
    void generateQrSvg(text).then((r) => {
      if (!alive) return
      if (r.ok) {
        setSvg(r.output)
        setError('')
      } else {
        setSvg('')
        setError(r.error?.message ?? '生成失败')
      }
    })
    return () => {
      alive = false
    }
  }, [text])

  function download() {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qrcode.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-2">
      <div className="flex min-w-0 flex-col border-r border-zinc-200 p-4 dark:border-zinc-800">
        <label htmlFor="qr-text" className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {t('qr.text')}
        </label>
        <textarea
          id="qr-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('qr.textPlaceholder')}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex min-w-0 flex-col items-center justify-center gap-4 p-4">
        {svg ? (
          <>
            <div
              className="rounded-lg bg-white p-3 shadow-sm [&_svg]:h-56 [&_svg]:w-56"
              // SVG 由本地 qrcode 库生成，内容可信
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <button
              type="button"
              onClick={download}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t('qr.download')}
            </button>
          </>
        ) : (
          <span className="text-sm text-rose-500">{error || <span className="text-zinc-400">{t('qr.genHint')}</span>}</span>
        )}
      </div>
    </div>
  )
}

function Decode() {
  const t = useT()
  const [result, setResult] = useState('')
  const [status, setStatus] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    setStatus(t('qr.decoding'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url) // 图片已解码，URL 不再需要（统一在此释放）
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setStatus(t('qr.readFail'))
        return
      }
      // 限制最大边，避免超大图片占用过多内存 / 卡顿
      const MAX = 2000
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(data.data, data.width, data.height)
      if (code) {
        setResult(code.data)
        setStatus(t('qr.decoded'))
      } else {
        setResult('')
        setStatus(t('qr.noCode'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setStatus(t('qr.loadFail'))
    }
    img.src = url
  }

  function copy() {
    if (!result) return
    void navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const dropHint = status || t('qr.dropHint')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFile(e.dataTransfer.files[0])
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-10 text-sm text-zinc-500 transition-colors hover:border-teal-500/60 hover:text-teal-600 dark:border-zinc-700"
      >
        <span>{dropHint}</span>
        <span className="text-xs text-zinc-400">{t('qr.dropSub')}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{t('qr.result')}</span>
        <button
          type="button"
          onClick={copy}
          disabled={!result}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-teal-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-teal-400"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied ? t('action.copied') : t('action.copy')}
        </button>
      </div>
      <pre aria-live="polite" className="min-h-0 flex-1 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm whitespace-pre-wrap break-all dark:border-zinc-800 dark:bg-zinc-900">
        {result}
      </pre>
    </div>
  )
}

export function QrPanel({ tool }: { tool: ToolDef }) {
  return (
    <section aria-label={tool.name} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      {tool.id === 'qr-decode' ? <Decode /> : <Generate />}
    </section>
  )
}
