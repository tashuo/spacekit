# SpaceKit Batch 3C — 二维码（生成 / 解析）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Batch 3 的二维码部分——文本生成二维码（SVG，可下载）+ 上传图片解析二维码文本，纯本地、零网络。

**Architecture:** 生成逻辑是 `lib/tools/qr.ts` 纯函数（`qrcode` 库的 `toString` 生成 SVG 字符串，无 canvas 依赖、可单测）；解析依赖 `<canvas>`/`ImageData`（浏览器运行时），由 `QrPanel` 用 `jsqr` 在 UI 层完成。两个工具共用 `qrcode` 布局（Batch 1 已预留），`QrPanel` 按 `tool.id` 渲染生成/解析两种交互。

**Tech Stack:** 沿用现有栈；新增 `qrcode`（生成）、`jsqr`（解析）、`@types/qrcode`。

> **范围：** Batch 3 的二维码子计划。完成后产物可独立构建/测试/使用。`ToolLayout` 的 `'qrcode'` 在 Batch 1 已存在，无需改类型。

---

## File Structure

```
package.json            加 qrcode、jsqr、@types/qrcode          # Task 1
lib/tools/qr.ts         generateQrSvg（文本 → SVG 字符串）        # Task 2
lib/tools/registry.ts   注册 qr-generate / qr-decode（qrcode 布局）# Task 3
components/QrPanel.tsx   生成（SVG+下载）/ 解析（上传图片→文本）    # Task 4
entrypoints/app/App.tsx ToolView 加 case 'qrcode'                # Task 4
```

---

## Task 1: 安装依赖

- [ ] **Step 1: 安装**

Run: `cd /Users/yaming/Documents/chrome/spacekit && pnpm add qrcode jsqr && pnpm add -D @types/qrcode`
Expected: 安装成功。

- [ ] **Step 2: 现状仍绿**

Run: `pnpm test && pnpm compile`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: add qrcode + jsqr"
```

---

## Task 2: 二维码生成（SVG）

**Files:**
- Create: `lib/tools/qr.ts`, `tests/qr.test.ts`

> 用 `qrcode` 的 `toString({ type: 'svg' })` 产出 SVG 字符串（纯 JS，无 canvas，可在 happy-dom 下单测）；返回 `ToolResult.output` 为 SVG 文本，UI 直接内联渲染、并可下载为 `.svg`。

- [ ] **Step 1: 写失败测试**

`tests/qr.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateQrSvg } from '@/lib/tools/qr'

describe('generateQrSvg', () => {
  it('produces an svg string for text', async () => {
    const r = await generateQrSvg('https://example.com')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('<svg')
  })
  it('errors on empty input', async () => {
    expect((await generateQrSvg('   ')).ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test qr`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/qr.ts`**

```ts
import QRCode from 'qrcode'
import { ok, err, type ToolResult } from './types'

export async function generateQrSvg(text: string): Promise<ToolResult> {
  if (!text.trim()) return err('输入为空')
  try {
    const svg = await QRCode.toString(text, { type: 'svg', margin: 1, width: 240 })
    return ok(svg)
  } catch (e) {
    return err(e instanceof Error ? e.message : '生成失败')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test qr`
Expected: PASS。

> 若 `qrcode` 的导入（默认 vs 命名）或 `toString` 签名与此不符，以库实际 API 为最小调整；输出应为含 `<svg` 的字符串。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/qr.ts tests/qr.test.ts && git commit -m "feat: QR code SVG generator"
```

---

## Task 3: 注册表

**Files:**
- Modify: `lib/tools/registry.ts`, `tests/registry.test.ts`

- [ ] **Step 1: 补失败测试**

在 `tests/registry.test.ts` 的 `describe('registry', ...)` 内追加：
```ts
  it('registers qr tools with qrcode layout and no run', () => {
    for (const id of ['qr-generate', 'qr-decode']) {
      expect(findTool(id)!.layout).toBe('qrcode')
      expect(findTool(id)!.run).toBeUndefined()
    }
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test registry`
Expected: FAIL。

- [ ] **Step 3: `lib/tools/registry.ts` 注册**

在 `TOOLS` 末尾追加：
```ts
  { id: 'qr-generate', category: 'text', name: '二维码生成', keywords: ['qr', '二维码', 'qrcode', '生成'], layout: 'qrcode' },
  { id: 'qr-decode', category: 'text', name: '二维码解析', keywords: ['qr', '二维码', 'qrcode', '解析', '识别'], layout: 'qrcode' },
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test registry`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/registry.ts tests/registry.test.ts && git commit -m "feat: register qr tools"
```

---

## Task 4: QrPanel（qrcode 布局）+ App 分发

**Files:**
- Create: `components/QrPanel.tsx`
- Modify: `entrypoints/app/App.tsx`

> `QrPanel` 按 `tool.id` 分流：`qr-generate` 文本输入 → 异步生成 SVG → 内联渲染 + 下载；`qr-decode` 上传/拖拽图片 → 离屏 `<canvas>` 取 `ImageData` → `jsQR` 解析 → 显示文本。

- [ ] **Step 1: 创建 `components/QrPanel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { generateQrSvg } from '@/lib/tools/qr'
import { CopyIcon } from '@/components/icons'
import type { ToolDef } from '@/lib/tools/types'

function Generate() {
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
          文本 / 链接
        </label>
        <textarea
          id="qr-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要编码的文本或链接"
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
              下载 SVG
            </button>
          </>
        ) : (
          <span className="text-sm text-rose-500">{error || <span className="text-zinc-400">输入文本后生成二维码</span>}</span>
        )}
      </div>
    </div>
  )
}

function Decode() {
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('选择或拖入一张二维码图片')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    setStatus('识别中…')
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setStatus('无法读取图片')
        URL.revokeObjectURL(url)
        return
      }
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(data.data, data.width, data.height)
      URL.revokeObjectURL(url)
      if (code) {
        setResult(code.data)
        setStatus('识别成功')
      } else {
        setResult('')
        setStatus('未识别到二维码')
      }
    }
    img.onerror = () => {
      setStatus('图片加载失败')
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function copy() {
    if (!result) return
    void navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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
        <span>{status}</span>
        <span className="text-xs text-zinc-400">点击选择或拖拽图片到此</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">识别结果</span>
        <button
          type="button"
          onClick={copy}
          disabled={!result}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:text-teal-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-teal-400"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied ? '已复制' : '复制'}
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
```

- [ ] **Step 2: App 分发**

`entrypoints/app/App.tsx`：顶部加 `import { QrPanel } from '@/components/QrPanel'`；在 `ToolView` 的 `switch` 加：
```tsx
    case 'qrcode':
      return <QrPanel tool={tool} />
```

- [ ] **Step 3: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过。

- [ ] **Step 4: 手动验证**

命令面板搜「二维码生成」：输入链接 → 右侧出现二维码，点「下载 SVG」得文件。搜「二维码解析」：上传/拖入刚下载的二维码图片（或任意二维码截图）→ 显示文本（注：纯 SVG 需先转成位图截图；可用手机或在线二维码图片测试）。

- [ ] **Step 5: Commit**

```bash
git add components/QrPanel.tsx entrypoints/app/App.tsx && git commit -m "feat: QR generate/decode panel (qrcode layout)"
```

---

## Task 5: 收尾

- [ ] **Step 1: 全量校验**

Run: `pnpm test && pnpm compile && pnpm build`
Expected: 全绿。

- [ ] **Step 2: Commit（如有改动）**

```bash
git add -A && git commit -m "chore: batch-3c qrcode green"
```

---

## Self-Review 备注（已核对）

- **Spec 覆盖（§11 第 3 批的二维码）**：生成（Task 2 纯函数 + Task 4 UI）、解析（Task 4 UI + jsqr）。
- **类型一致性**：两个工具无 `run`、`layout: 'qrcode'`（Batch 1 已有该布局值），由 `QrPanel` 按 `tool.id` 分流；生成调纯函数 `generateQrSvg`（异步），解析在 UI 用 jsqr。
- **测试策略**：生成函数（SVG，无 canvas）可单测；解析依赖 `<canvas>`/`ImageData`/`Image`，浏览器运行时能力，沿用「compile+build+手动验证」策略，不强行在 happy-dom 下测试。
- **安全/隐私**：全部本地，零网络；生成的 SVG 来自本地 `qrcode` 库（可信源），故 `dangerouslySetInnerHTML` 内联渲染；图片解析在本地 canvas 完成，不上传。
- **已知简化/留待后续**：生成仅 SVG（矢量、可下载；如需 PNG 可后续加 `toDataURL`）；不暴露纠错级别/尺寸/边距等高级选项（用合理默认）；解析一次一张图。命令面板自动收录新工具。
