# SpaceKit Batch 1 (地基 + 核心工具) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 SpaceKit 插件地基（WXT + React + Tailwind + 工具注册表 + CodeMirror 外壳）并实现第 1 批核心纯函数工具（JSON 格式化/校验/转义、Base64/URL/Unicode 编解码、JWT 解析、时间戳、MD5/SHA 哈希），通过独立标签页可用。

**Architecture:** 所有工具逻辑是 `lib/tools/` 下的纯函数（无 DOM、无 React），100% 单测覆盖。UI 层（标签页 React 应用）通过声明式 `registry` 自动生成导航/搜索，调用纯函数。划词浮层留到第 2 批。

**Tech Stack:** WXT 0.20、React 18、Tailwind 4、TypeScript 5、Zustand 5、Zod 4、vitest 4、CodeMirror 6、Web Crypto API、`spark-md5`（MD5）。

---

## File Structure

```
package.json, wxt.config.ts, tsconfig.json, vitest.config.ts   # Task 1
assets/tailwind.css                                            # Task 1
lib/tools/types.ts          工具/注册表类型定义                  # Task 2
lib/tools/json.ts           格式化/压缩/校验/转义                 # Task 3
lib/tools/codec.ts          Base64/URL/Unicode                  # Task 4
lib/tools/jwt.ts            JWT 解析                            # Task 5
lib/tools/timestamp.ts      时间戳↔日期                          # Task 6
lib/tools/hash.ts           MD5/SHA                             # Task 7
lib/tools/registry.ts       工具注册表（驱动导航/搜索）           # Task 8
lib/store/prefs.ts          Zustand 偏好状态                     # Task 9
components/Editor.tsx       CodeMirror 封装                      # Task 10
components/ToolPanel.tsx    双栏工具面板                         # Task 11
components/Sidebar.tsx      左侧导航 + 搜索                       # Task 11
entrypoints/app/...         标签页应用外壳                        # Task 12
entrypoints/background.ts   点图标开标签页                        # Task 13
tests/*.test.ts             各 lib 模块单测                       # 随对应 Task
```

---

## Task 1: 脚手架 (WXT + React + Tailwind + vitest)

**Files:**
- Create: `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `assets/tailwind.css`, `entrypoints/app/index.html`, `entrypoints/app/main.tsx`, `entrypoints/app/App.tsx`

- [ ] **Step 1: 写 `package.json`**

```json
{
  "name": "spacekit",
  "description": "Local-first developer toolbox: JSON, codec, JWT, timestamp, hash. Zero network, no data collection.",
  "private": true,
  "version": "0.1.0",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "compile": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "postinstall": "wxt prepare"
  },
  "devDependencies": {
    "@types/chrome": "^0.1.40",
    "@types/react": "^18.3.28",
    "@types/react-dom": "^18.3.7",
    "@wxt-dev/module-react": "^1.1.5",
    "happy-dom": "^20.9.0",
    "typescript": "^5.9.3",
    "vitest": "^4.1.6",
    "wxt": "^0.20.25"
  },
  "dependencies": {
    "@codemirror/lang-json": "^6.0.1",
    "@codemirror/lint": "^6.8.4",
    "@codemirror/state": "^6.5.2",
    "@codemirror/view": "^6.36.4",
    "@tailwindcss/vite": "^4.3.0",
    "codemirror": "^6.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "spark-md5": "^3.0.2",
    "tailwindcss": "^4.3.0",
    "zod": "^4.4.3",
    "zustand": "^5.0.13"
  }
}
```

- [ ] **Step 2: 装依赖**

Run: `cd /Users/yaming/Documents/chrome/spacekit && pnpm install`
Expected: 安装成功，生成 `node_modules` 与 lockfile。

- [ ] **Step 3: 写 `tsconfig.json`**

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  }
}
```

- [ ] **Step 4: 写 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  test: { environment: 'happy-dom', globals: true },
})
```

- [ ] **Step 5: 写 `wxt.config.ts`**

```ts
import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'SpaceKit',
    description: 'Local-first developer toolbox. Zero network, no data collection.',
    version: '0.1.0',
    permissions: ['storage'],
    action: { default_title: 'SpaceKit' },
  },
})
```

- [ ] **Step 6: 写 `assets/tailwind.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: 写最小标签页应用占位**

`entrypoints/app/index.html`:
```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>SpaceKit</title></head>
  <body><div id="root"></div><script type="module" src="./main.tsx"></script></body>
</html>
```
`entrypoints/app/main.tsx`:
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@/assets/tailwind.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
```
`entrypoints/app/App.tsx`:
```tsx
export function App() {
  return <div className="p-4 text-lg">SpaceKit</div>
}
```

- [ ] **Step 8: 验证构建**

Run: `pnpm compile && pnpm build`
Expected: 类型检查通过，`.output/chrome-mv3` 生成无报错。

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "chore: scaffold WXT + React + Tailwind + vitest"
```

---

## Task 2: 工具类型定义

**Files:**
- Create: `lib/tools/types.ts`

- [ ] **Step 1: 写类型**

```ts
// 工具运行结果：成功带 output，失败带 error（含可选行列定位）
export interface ToolResult {
  ok: boolean
  output: string
  error?: { message: string; line?: number; column?: number }
}

export const ok = (output: string): ToolResult => ({ ok: true, output })
export const err = (message: string, pos?: { line?: number; column?: number }): ToolResult => ({
  ok: false,
  output: '',
  error: { message, ...pos },
})

// 工具的界面布局类型（Batch 1 只用 io；其余留给后续批次）
export type ToolLayout = 'io' | 'diff' | 'regex' | 'qrcode'

export type ToolCategory = 'json' | 'convert' | 'codec' | 'timestamp' | 'crypto' | 'text'

// 注册表条目：声明式描述一个工具
export interface ToolDef {
  id: string
  category: ToolCategory
  // i18n key；Batch 1 暂用中文字面量，第 9 段接入 i18n 后替换
  name: string
  keywords: string[]
  layout: ToolLayout
  // io 布局的纯函数：输入字符串 + 选项 → 结果
  run?: (input: string, options?: Record<string, unknown>) => ToolResult
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/tools/types.ts && git commit -m "feat: tool result + registry types"
```

---

## Task 3: JSON 工具 (格式化/压缩/校验/转义)

**Files:**
- Create: `lib/tools/json.ts`, `tests/json.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/json.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson, escapeJson, unescapeJson } from '@/lib/tools/json'

describe('formatJson', () => {
  it('pretty-prints with 2 spaces', () => {
    const r = formatJson('{"a":1,"b":[2,3]}')
    expect(r.ok).toBe(true)
    expect(r.output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
  })
  it('reports line/column on invalid JSON', () => {
    const r = formatJson('{"a":}')
    expect(r.ok).toBe(false)
    expect(r.error?.line).toBe(1)
    expect(typeof r.error?.column).toBe('number')
  })
  it('errors on empty input', () => {
    expect(formatJson('   ').ok).toBe(false)
  })
})

describe('minifyJson', () => {
  it('removes whitespace', () => {
    expect(minifyJson('{ "a": 1 }').output).toBe('{"a":1}')
  })
})

describe('escape/unescape', () => {
  it('escapes to a JSON string literal body', () => {
    expect(escapeJson('a"b\n').output).toBe('a\\"b\\n')
  })
  it('unescapes back', () => {
    expect(unescapeJson('a\\"b\\n').output).toBe('a"b\n')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test json`
Expected: FAIL（`formatJson` 未定义）。

- [ ] **Step 3: 实现 `lib/tools/json.ts`**

```ts
import { ok, err, type ToolResult } from './types'

// 从 JSON.parse 的报错信息里尽力解析出 position，再换算成 line/column
function locate(input: string, e: unknown): { line?: number; column?: number } {
  const msg = e instanceof Error ? e.message : String(e)
  const m = msg.match(/position (\d+)/)
  if (!m) return {}
  const pos = Number(m[1])
  const upTo = input.slice(0, pos)
  const line = upTo.split('\n').length
  const column = pos - upTo.lastIndexOf('\n')
  return { line, column }
}

export function formatJson(input: string, options?: { indent?: number }): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    const value = JSON.parse(input)
    return ok(JSON.stringify(value, null, options?.indent ?? 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON', locate(input, e))
  }
}

export function minifyJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(JSON.parse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON', locate(input, e))
  }
}

// 把任意文本转成 JSON 字符串字面量的"内容"（不含外层引号）
export function escapeJson(input: string): ToolResult {
  const quoted = JSON.stringify(input) // 形如 "...."
  return ok(quoted.slice(1, -1))
}

export function unescapeJson(input: string): ToolResult {
  try {
    return ok(JSON.parse(`"${input}"`))
  } catch {
    return err('无法解析转义序列')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test json`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/json.ts tests/json.test.ts && git commit -m "feat: JSON format/minify/escape tools"
```

---

## Task 4: 编解码 (Base64/URL/Unicode)

**Files:**
- Create: `lib/tools/codec.ts`, `tests/codec.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/codec.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  encodeBase64, decodeBase64, encodeUrl, decodeUrl, encodeUnicode, decodeUnicode,
} from '@/lib/tools/codec'

describe('base64 (utf-8 safe)', () => {
  it('round-trips unicode', () => {
    const e = encodeBase64('你好 hi')
    expect(e.ok).toBe(true)
    expect(decodeBase64(e.output).output).toBe('你好 hi')
  })
  it('errors on invalid base64', () => {
    expect(decodeBase64('!!!!').ok).toBe(false)
  })
})

describe('url', () => {
  it('encodes and decodes components', () => {
    expect(encodeUrl('a b&c=中').output).toBe('a%20b%26c%3D%E4%B8%AD')
    expect(decodeUrl('a%20b%26c%3D%E4%B8%AD').output).toBe('a b&c=中')
  })
})

describe('unicode \\uXXXX', () => {
  it('encodes non-ascii to \\uXXXX', () => {
    expect(encodeUnicode('A中').output).toBe('A\\u4e2d')
  })
  it('decodes back', () => {
    expect(decodeUnicode('A\\u4e2d').output).toBe('A中')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test codec`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/codec.ts`**

```ts
import { ok, err, type ToolResult } from './types'

const te = new TextEncoder()
const td = new TextDecoder()

export function encodeBase64(input: string): ToolResult {
  const bytes = te.encode(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return ok(btoa(bin))
}

export function decodeBase64(input: string): ToolResult {
  try {
    const bin = atob(input.trim())
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return ok(td.decode(bytes))
  } catch {
    return err('非法 Base64')
  }
}

export function encodeUrl(input: string): ToolResult {
  return ok(encodeURIComponent(input))
}

export function decodeUrl(input: string): ToolResult {
  try {
    return ok(decodeURIComponent(input))
  } catch {
    return err('非法 URL 编码')
  }
}

export function encodeUnicode(input: string): ToolResult {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0)!
    out += code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : ch
  }
  return ok(out)
}

export function decodeUnicode(input: string): ToolResult {
  return ok(input.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test codec`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/codec.ts tests/codec.test.ts && git commit -m "feat: base64/url/unicode codec tools"
```

---

## Task 5: JWT 解析

**Files:**
- Create: `lib/tools/jwt.ts`, `tests/jwt.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/jwt.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { decodeJwt } from '@/lib/tools/jwt'

// header {"alg":"HS256","typ":"JWT"} . payload {"sub":"123","name":"Tom"} . sig
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVG9tIn0.abc'

describe('decodeJwt', () => {
  it('decodes header and payload as pretty JSON', () => {
    const r = decodeJwt(TOKEN)
    expect(r.ok).toBe(true)
    expect(r.output).toContain('"alg": "HS256"')
    expect(r.output).toContain('"name": "Tom"')
  })
  it('errors when not three segments', () => {
    expect(decodeJwt('a.b').ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test jwt`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/jwt.ts`**

```ts
import { ok, err, type ToolResult } from './types'

function b64urlToJson(seg: string): unknown {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(seg.length / 4) * 4, '=')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function decodeJwt(input: string): ToolResult {
  const parts = input.trim().split('.')
  if (parts.length !== 3) return err('JWT 必须由 3 段（header.payload.signature）组成')
  try {
    const header = b64urlToJson(parts[0])
    const payload = b64urlToJson(parts[1])
    return ok(
      JSON.stringify({ header, payload, signature: parts[2] }, null, 2),
    )
  } catch {
    return err('无法解析 JWT（header/payload 不是合法的 Base64URL JSON）')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test jwt`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/jwt.ts tests/jwt.test.ts && git commit -m "feat: JWT decode tool"
```

---

## Task 6: 时间戳

**Files:**
- Create: `lib/tools/timestamp.ts`, `tests/timestamp.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/timestamp.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { tsToDate, dateToTs } from '@/lib/tools/timestamp'

describe('tsToDate', () => {
  it('parses seconds (10 digits) as UTC ISO', () => {
    // 1700000000 = 2023-11-14T22:13:20Z
    expect(tsToDate('1700000000', { unit: 'auto', tz: 'UTC' }).output).toBe(
      '2023-11-14 22:13:20',
    )
  })
  it('parses milliseconds (13 digits)', () => {
    expect(tsToDate('1700000000000', { unit: 'auto', tz: 'UTC' }).output).toBe(
      '2023-11-14 22:13:20',
    )
  })
  it('errors on non-numeric', () => {
    expect(tsToDate('abc', { unit: 'auto', tz: 'UTC' }).ok).toBe(false)
  })
})

describe('dateToTs', () => {
  it('converts UTC date string to seconds', () => {
    expect(dateToTs('2023-11-14 22:13:20', { tz: 'UTC' }).output).toBe('1700000000')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test timestamp`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/timestamp.ts`**

```ts
import { ok, err, type ToolResult } from './types'

type Unit = 'auto' | 's' | 'ms'

// 用 Intl 把 epoch 毫秒格式化为指定时区的 "YYYY-MM-DD HH:mm:ss"
function formatInTz(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}:${get('second')}`
}

export function tsToDate(input: string, opts: { unit: Unit; tz: string }): ToolResult {
  const raw = input.trim()
  if (!/^\d+$/.test(raw)) return err('时间戳必须是数字')
  let ms = Number(raw)
  const unit = opts.unit === 'auto' ? (raw.length <= 11 ? 's' : 'ms') : opts.unit
  if (unit === 's') ms *= 1000
  return ok(formatInTz(ms, opts.tz))
}

// 仅支持 UTC 反解（前端常用场景）；其他时区在 UI 选项里限制为 UTC/本地。
export function dateToTs(input: string, opts: { tz: string }): ToolResult {
  const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return err('日期格式应为 YYYY-MM-DD HH:mm:ss')
  const [, y, mo, d, h, mi, s] = m.map(Number) as unknown as number[]
  const ms =
    opts.tz === 'UTC'
      ? Date.UTC(y, mo - 1, d, h, mi, s)
      : new Date(y, mo - 1, d, h, mi, s).getTime()
  return ok(String(Math.floor(ms / 1000)))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test timestamp`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/timestamp.ts tests/timestamp.test.ts && git commit -m "feat: timestamp <-> date tool"
```

---

## Task 7: 哈希 (MD5/SHA)

**Files:**
- Create: `lib/tools/hash.ts`, `tests/hash.test.ts`

> 说明：MD5 用 `spark-md5`（同步）；SHA 用 Web Crypto（异步，返回 Promise）。

- [ ] **Step 1: 写失败测试**

`tests/hash.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { md5, sha } from '@/lib/tools/hash'

describe('md5', () => {
  it('hashes empty string', () => {
    expect(md5('').output).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
  it('hashes abc', () => {
    expect(md5('abc').output).toBe('900150983cd24fb0d6963f7d28e17f72')
  })
})

describe('sha', () => {
  it('sha-256 of abc', async () => {
    const r = await sha('abc', 'SHA-256')
    expect(r.output).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test hash`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/hash.ts`**

```ts
import SparkMD5 from 'spark-md5'
import { ok, type ToolResult } from './types'

export function md5(input: string): ToolResult {
  return ok(SparkMD5.hash(input))
}

export type ShaAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export async function sha(input: string, algo: ShaAlgo): Promise<ToolResult> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest(algo, data)
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return ok(hex)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test hash`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/hash.ts tests/hash.test.ts && git commit -m "feat: md5/sha hash tools"
```

---

## Task 8: 工具注册表

**Files:**
- Create: `lib/tools/registry.ts`, `tests/registry.test.ts`

> 注：SHA 是异步、MD5 是同步、时间戳/编解码需要选项。为让注册表统一为 `(input, options) => ToolResult`，对带选项/异步的工具在此用同步包装（SHA 暂以 SHA-256 同步展示需要异步——为简化 Batch 1，注册表的 `run` 只覆盖同步工具；哈希中 SHA 在 UI 层单独处理。MD5 入注册表）。

- [ ] **Step 1: 写失败测试**

`tests/registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { TOOLS, findTool, searchTools } from '@/lib/tools/registry'

describe('registry', () => {
  it('every tool has a unique id', () => {
    const ids = TOOLS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('findTool returns the matching def', () => {
    expect(findTool('json-format')?.category).toBe('json')
  })
  it('searchTools matches name and keywords', () => {
    expect(searchTools('base64').some((t) => t.id === 'base64-encode')).toBe(true)
    expect(searchTools('格式化').some((t) => t.id === 'json-format')).toBe(true)
  })
  it('io tools run end-to-end', () => {
    expect(findTool('json-format')!.run!('{"a":1}').output).toBe('{\n  "a": 1\n}')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test registry`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/registry.ts`**

```ts
import type { ToolDef } from './types'
import { formatJson, minifyJson, escapeJson, unescapeJson } from './json'
import { encodeBase64, decodeBase64, encodeUrl, decodeUrl, encodeUnicode, decodeUnicode } from './codec'
import { decodeJwt } from './jwt'
import { tsToDate, dateToTs } from './timestamp'
import { md5 } from './hash'

export const TOOLS: ToolDef[] = [
  { id: 'json-format', category: 'json', name: 'JSON 格式化', keywords: ['json', 'format', '格式化', '美化'], layout: 'io', run: (i, o) => formatJson(i, o) },
  { id: 'json-minify', category: 'json', name: 'JSON 压缩', keywords: ['json', 'minify', '压缩'], layout: 'io', run: (i) => minifyJson(i) },
  { id: 'json-escape', category: 'json', name: 'JSON 转义', keywords: ['json', 'escape', '转义'], layout: 'io', run: (i) => escapeJson(i) },
  { id: 'json-unescape', category: 'json', name: 'JSON 去转义', keywords: ['json', 'unescape', '去转义'], layout: 'io', run: (i) => unescapeJson(i) },
  { id: 'base64-encode', category: 'codec', name: 'Base64 编码', keywords: ['base64', '编码'], layout: 'io', run: (i) => encodeBase64(i) },
  { id: 'base64-decode', category: 'codec', name: 'Base64 解码', keywords: ['base64', '解码'], layout: 'io', run: (i) => decodeBase64(i) },
  { id: 'url-encode', category: 'codec', name: 'URL 编码', keywords: ['url', '编码'], layout: 'io', run: (i) => encodeUrl(i) },
  { id: 'url-decode', category: 'codec', name: 'URL 解码', keywords: ['url', '解码'], layout: 'io', run: (i) => decodeUrl(i) },
  { id: 'unicode-encode', category: 'codec', name: 'Unicode 编码', keywords: ['unicode', '编码'], layout: 'io', run: (i) => encodeUnicode(i) },
  { id: 'unicode-decode', category: 'codec', name: 'Unicode 解码', keywords: ['unicode', '解码'], layout: 'io', run: (i) => decodeUnicode(i) },
  { id: 'jwt-decode', category: 'codec', name: 'JWT 解析', keywords: ['jwt', 'token', '解析'], layout: 'io', run: (i) => decodeJwt(i) },
  { id: 'ts-to-date', category: 'timestamp', name: '时间戳转日期', keywords: ['timestamp', '时间戳', '日期'], layout: 'io', run: (i, o) => tsToDate(i, { unit: 'auto', tz: (o?.tz as string) ?? 'UTC' }) },
  { id: 'date-to-ts', category: 'timestamp', name: '日期转时间戳', keywords: ['timestamp', '时间戳', '日期'], layout: 'io', run: (i, o) => dateToTs(i, { tz: (o?.tz as string) ?? 'UTC' }) },
  { id: 'md5', category: 'crypto', name: 'MD5', keywords: ['md5', 'hash', '哈希'], layout: 'io', run: (i) => md5(i) },
]

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return TOOLS
  return TOOLS.filter(
    (t) => t.name.toLowerCase().includes(q) || t.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test registry`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/registry.ts tests/registry.test.ts && git commit -m "feat: declarative tool registry + search"
```

---

## Task 9: 偏好状态 (Zustand)

**Files:**
- Create: `lib/store/prefs.ts`

- [ ] **Step 1: 实现（持久化到 chrome.storage.local，不存输入内容）**

```ts
import { create } from 'zustand'

export type Theme = 'system' | 'light' | 'dark'

interface PrefsState {
  lastToolId: string
  theme: Theme
  tz: string // 'UTC' | 'local'
  setLastTool: (id: string) => void
  setTheme: (t: Theme) => void
  setTz: (tz: string) => void
  hydrate: () => Promise<void>
}

const KEY = 'spacekit:prefs'

async function persist(p: { lastToolId: string; theme: Theme; tz: string }) {
  await chrome.storage?.local.set({ [KEY]: p })
}

export const usePrefs = create<PrefsState>((set, get) => ({
  lastToolId: 'json-format',
  theme: 'system',
  tz: 'UTC',
  setLastTool: (id) => { set({ lastToolId: id }); void persist({ ...get(), lastToolId: id }) },
  setTheme: (t) => { set({ theme: t }); void persist({ ...get(), theme: t }) },
  setTz: (tz) => { set({ tz }); void persist({ ...get(), tz }) },
  hydrate: async () => {
    const stored = await chrome.storage?.local.get(KEY)
    const p = stored?.[KEY]
    if (p) set({ lastToolId: p.lastToolId, theme: p.theme, tz: p.tz })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add lib/store/prefs.ts && git commit -m "feat: zustand prefs store (no input persisted)"
```

---

## Task 10: CodeMirror 编辑器封装

**Files:**
- Create: `components/Editor.tsx`

- [ ] **Step 1: 实现**

```tsx
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'

interface EditorProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  language?: 'json' | 'text'
}

export function Editor({ value, onChange, readOnly = false, language = 'text' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!host.current) return
    const extensions = [
      basicSetup,
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
      EditorView.lineWrapping,
      ...(language === 'json' ? [json()] : []),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && onChange) onChange(u.state.doc.toString())
      }),
    ]
    const v = new EditorView({ state: EditorState.create({ doc: value, extensions }), parent: host.current })
    view.current = v
    return () => v.destroy()
    // 仅在挂载/只读/语言变化时重建
  }, [readOnly, language])

  // 外部 value 变化时同步（如点击"示例""清空"或只读输出更新）
  useEffect(() => {
    const v = view.current
    if (v && value !== v.state.doc.toString()) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  return <div ref={host} className="h-full overflow-auto border rounded text-sm" />
}
```

- [ ] **Step 2: 验证编译**

Run: `pnpm compile`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add components/Editor.tsx && git commit -m "feat: CodeMirror editor wrapper"
```

---

## Task 11: 导航侧栏 + 工具面板

**Files:**
- Create: `components/Sidebar.tsx`, `components/ToolPanel.tsx`

- [ ] **Step 1: 实现 `components/Sidebar.tsx`**

```tsx
import { useState } from 'react'
import { TOOLS, searchTools } from '@/lib/tools/registry'
import type { ToolCategory } from '@/lib/tools/types'

const CAT_LABEL: Record<ToolCategory, string> = {
  json: 'JSON', convert: '转换', codec: '编解码', timestamp: '时间戳', crypto: '加解密', text: '文本',
}

export function Sidebar({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const [q, setQ] = useState('')
  const list = searchTools(q)
  const cats = [...new Set(list.map((t) => t.category))]
  return (
    <aside className="w-56 shrink-0 border-r h-full overflow-auto p-2">
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工具…"
        className="w-full mb-3 px-2 py-1 border rounded text-sm"
      />
      {cats.map((c) => (
        <div key={c} className="mb-3">
          <div className="text-xs text-gray-500 px-2 mb-1">{CAT_LABEL[c]}</div>
          {list.filter((t) => t.category === c).map((t) => (
            <button
              key={t.id} onClick={() => onSelect(t.id)}
              className={`block w-full text-left px-2 py-1 rounded text-sm ${t.id === activeId ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >{t.name}</button>
          ))}
        </div>
      ))}
      {list.length === 0 && <div className="text-xs text-gray-400 px-2">无匹配工具</div>}
    </aside>
  )
}
```

- [ ] **Step 2: 实现 `components/ToolPanel.tsx`（io 布局）**

```tsx
import { useEffect, useState } from 'react'
import { Editor } from './Editor'
import type { ToolDef, ToolResult } from '@/lib/tools/types'

export function ToolPanel({ tool }: { tool: ToolDef }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ToolResult>({ ok: true, output: '' })

  useEffect(() => { setInput(''); setResult({ ok: true, output: '' }) }, [tool.id])

  function run() {
    if (tool.run) setResult(tool.run(input))
  }

  return (
    <section className="flex-1 flex flex-col h-full p-3 gap-2">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{tool.name}</h2>
        <div className="flex-1" />
        <button onClick={run} className="px-3 py-1 text-sm border rounded bg-blue-600 text-white">运行</button>
        <button onClick={() => navigator.clipboard.writeText(result.output)} className="px-3 py-1 text-sm border rounded">复制结果</button>
        <button onClick={() => { setInput(''); setResult({ ok: true, output: '' }) }} className="px-3 py-1 text-sm border rounded">清空</button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        <Editor value={input} onChange={setInput} language={tool.category === 'json' ? 'json' : 'text'} />
        <Editor value={result.output} readOnly language={tool.category === 'json' ? 'json' : 'text'} />
      </div>
      <div className="text-sm h-5">
        {result.ok
          ? <span className="text-green-600">✓ 完成</span>
          : <span className="text-red-600">✗ {result.error?.message}{result.error?.line ? ` (第 ${result.error.line} 行第 ${result.error.column} 列)` : ''}</span>}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 验证编译**

Run: `pnpm compile`
Expected: 通过。

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.tsx components/ToolPanel.tsx && git commit -m "feat: sidebar nav + io tool panel"
```

---

## Task 12: 组装标签页应用 + 主题

**Files:**
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 实现 `App.tsx`**

```tsx
import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ToolPanel } from '@/components/ToolPanel'
import { findTool } from '@/lib/tools/registry'
import { usePrefs } from '@/lib/store/prefs'

export function App() {
  const { lastToolId, setLastTool, theme, setTheme, hydrate } = usePrefs()
  useEffect(() => { void hydrate() }, [])
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }, [theme])

  const tool = findTool(lastToolId) ?? findTool('json-format')!

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-3 px-4 py-2 border-b">
        <span className="font-semibold">SpaceKit</span>
        <div className="flex-1" />
        <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="text-sm border rounded px-1">
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </header>
      <div className="flex-1 flex min-h-0">
        <Sidebar activeId={tool.id} onSelect={setLastTool} />
        <ToolPanel tool={tool} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证构建**

Run: `pnpm compile && pnpm build`
Expected: 通过，`.output/chrome-mv3` 生成。

- [ ] **Step 3: 手动验证**

加载 `.output/chrome-mv3` 到 `chrome://extensions`，打开标签页应用（Task 13 后可点图标；此时先用 dev 模式），逐个验证：JSON 格式化报错定位、Base64 往返、JWT 解析、时间戳、MD5。

- [ ] **Step 4: Commit**

```bash
git add entrypoints/app/App.tsx && git commit -m "feat: assemble app shell with theme + nav"
```

---

## Task 13: 点击图标打开标签页

**Files:**
- Create: `entrypoints/background.ts`

- [ ] **Step 1: 实现**

```ts
export default defineBackground(() => {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('/app.html') })
  })
})
```

> 注：WXT 中 `entrypoints/app/index.html` 输出为 `/app.html`。若实际输出路径不同，以 `pnpm build` 后 `.output/chrome-mv3` 内的文件名为准并修正此处 URL。

- [ ] **Step 2: 验证构建 + 手动验证**

Run: `pnpm build`
Expected: 通过；重新加载扩展，点击图标在新标签页打开 SpaceKit。

- [ ] **Step 3: Commit**

```bash
git add entrypoints/background.ts && git commit -m "feat: open app tab on action click"
```

---

## Task 14: 全量测试 + 收尾

- [ ] **Step 1: 跑全部测试 + 类型检查 + 构建**

Run: `pnpm test && pnpm compile && pnpm build`
Expected: 全绿。

- [ ] **Step 2: Commit（如有改动）**

```bash
git add -A && git commit -m "chore: batch-1 green (tests + build)"
```

---

## Self-Review 备注（已核对）

- **Spec 覆盖**：本计划覆盖 spec 第 11 节"第 1 批"全部条目（外壳、registry、CodeMirror 封装、JSON 格式化/校验/转义、Base64/URL/Unicode、JWT、时间戳、MD5/SHA）。i18n（spec §8）、`<all_urls>` 权限与浮层（spec §5.2/§7）、商店素材（spec §9）属于第 2 批及之后，本批 manifest 仅含 `storage`。
- **类型一致性**：`ToolResult`/`ok`/`err`/`ToolDef` 在 Task 2 定义，后续 Task 3–8、10–12 均按此签名使用；注册表 `run: (input, options) => ToolResult` 与各纯函数签名一致（带选项的时间戳工具在注册表内做了适配包装）。
- **已知简化**：SHA 为异步，Batch 1 注册表只纳入同步的 MD5，SHA 函数已实现并测试，UI 接入留待后续（或在 Task 11 增加异步运行分支）。此简化已在 Task 7/8 备注标明，非占位符。
