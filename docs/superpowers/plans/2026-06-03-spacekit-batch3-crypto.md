# SpaceKit Batch 3B — 加解密（对称 + SM3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Batch 3 的加解密部分——对称加解密 AES / DES / 3DES（密码短语）+ 国密 SM4（hex 密钥）+ 国密 SM3 哈希，纯本地、零网络。

**Architecture:** 对称加解密逻辑是 `lib/tools/crypto.ts` 纯函数（crypto-js 同步 API + sm-crypto SM4）；SM3 加入 `lib/tools/hash.ts`（与 MD5 同构，io 布局）。对称工具需「文本 + 密钥 + 加/解密方向」，新增 `crypto` 布局 + `CryptoPanel`，按 `tool.id` 选算法；SM3 走 io 布局。

**Tech Stack:** 沿用现有栈；新增 `crypto-js`（AES/DES/3DES）、`sm-crypto`（SM3/SM4）、`@types/crypto-js`。

> **范围：** 本批为对称加解密 + SM3。**RSA / SM2 非对称**（需密钥对生成、公钥/私钥框）留作 3B 后续。所有处理纯本地，无网络请求。完成后产物可独立构建/测试/使用。

---

## File Structure

```
package.json              加 crypto-js、sm-crypto、@types/crypto-js     # Task 1
types/sm-crypto.d.ts      sm-crypto 模块类型声明                        # Task 1
lib/tools/crypto.ts       symEncrypt/symDecrypt(AES/DES/3DES) + sm4*    # Task 2
lib/tools/hash.ts         加 sm3                                        # Task 3
lib/tools/types.ts        ToolLayout 加 'crypto'                        # Task 4
lib/tools/registry.ts     注册 sm3(io) + aes/des/triple-des/sm4(crypto) # Task 4
components/CryptoPanel.tsx 对称加解密面板                                # Task 5
entrypoints/app/App.tsx   ToolView 加 case 'crypto'                     # Task 5
```

---

## Task 1: 安装依赖 + 类型声明

- [ ] **Step 1: 安装**

Run: `cd /Users/yaming/Documents/chrome/spacekit && pnpm add crypto-js sm-crypto && pnpm add -D @types/crypto-js`
Expected: 安装成功。

- [ ] **Step 2: 创建 `types/sm-crypto.d.ts`**

```ts
declare module 'sm-crypto' {
  export const sm3: (msg: string) => string
  export const sm4: {
    encrypt: (msg: string, key: string) => string
    decrypt: (cipher: string, key: string) => string
  }
}
```

- [ ] **Step 3: 现状仍绿**

Run: `pnpm test && pnpm compile`
Expected: 78 测试通过、类型检查通过。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml types/sm-crypto.d.ts && git commit -m "chore: add crypto-js + sm-crypto"
```

---

## Task 2: 对称加解密

**Files:**
- Create: `lib/tools/crypto.ts`, `tests/crypto.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/crypto.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { symEncrypt, symDecrypt, sm4Encrypt, sm4Decrypt } from '@/lib/tools/crypto'

const ALGOS = ['AES', 'DES', 'TripleDES'] as const

describe('symmetric round-trip', () => {
  for (const algo of ALGOS) {
    it(`${algo} encrypts then decrypts back`, () => {
      const c = symEncrypt(algo, '你好 hello', 'pass-phrase')
      expect(c.ok).toBe(true)
      expect(symDecrypt(algo, c.output, 'pass-phrase').output).toBe('你好 hello')
    })
    it(`${algo} fails to decrypt with wrong key`, () => {
      const c = symEncrypt(algo, 'secret', 'k1')
      expect(symDecrypt(algo, c.output, 'k2').ok).toBe(false)
    })
  }
  it('errors on empty text / key', () => {
    expect(symEncrypt('AES', '  ', 'k').ok).toBe(false)
    expect(symEncrypt('AES', 'x', '').ok).toBe(false)
  })
})

describe('SM4 (hex key)', () => {
  const KEY = '0123456789abcdeffedcba9876543210'
  it('round-trips with a valid 32-hex key', () => {
    const c = sm4Encrypt('你好 hello', KEY)
    expect(c.ok).toBe(true)
    expect(sm4Decrypt(c.output, KEY).output).toBe('你好 hello')
  })
  it('rejects an invalid key', () => {
    expect(sm4Encrypt('x', 'short').ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test crypto`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/crypto.ts`**

```ts
import CryptoJS from 'crypto-js'
import { sm4 } from 'sm-crypto'
import { ok, err, type ToolResult } from './types'

export type SymAlgo = 'AES' | 'DES' | 'TripleDES'
const CJS: Record<SymAlgo, typeof CryptoJS.AES> = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES,
}

export function symEncrypt(algo: SymAlgo, text: string, key: string): ToolResult {
  if (!text.trim()) return err('输入为空')
  if (!key) return err('请输入密钥')
  try {
    return ok(CJS[algo].encrypt(text, key).toString())
  } catch (e) {
    return err(e instanceof Error ? e.message : '加密失败')
  }
}

export function symDecrypt(algo: SymAlgo, cipher: string, key: string): ToolResult {
  if (!cipher.trim()) return err('输入为空')
  if (!key) return err('请输入密钥')
  try {
    const s = CJS[algo].decrypt(cipher, key).toString(CryptoJS.enc.Utf8)
    return s ? ok(s) : err('解密失败（密钥错误或密文非法）')
  } catch (e) {
    return err(e instanceof Error ? e.message : '解密失败')
  }
}

// SM4：sm-crypto 要求 32 位十六进制密钥（16 字节）
const validSm4Key = (key: string) => /^[0-9a-fA-F]{32}$/.test(key)

export function sm4Encrypt(text: string, key: string): ToolResult {
  if (!text.trim()) return err('输入为空')
  if (!validSm4Key(key)) return err('SM4 密钥需为 32 位十六进制（16 字节）')
  try {
    return ok(sm4.encrypt(text, key))
  } catch (e) {
    return err(e instanceof Error ? e.message : '加密失败')
  }
}

export function sm4Decrypt(cipher: string, key: string): ToolResult {
  if (!cipher.trim()) return err('输入为空')
  if (!validSm4Key(key)) return err('SM4 密钥需为 32 位十六进制（16 字节）')
  try {
    const s = sm4.decrypt(cipher, key)
    return s ? ok(s) : err('解密失败')
  } catch (e) {
    return err(e instanceof Error ? e.message : '解密失败')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test crypto`
Expected: PASS。

> 若 `crypto-js` / `sm-crypto` 的导入或 API 与此不符（版本差异、默认导出 vs 命名导出），以库实际 API 为最小调整；round-trip 用例必须通过。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/crypto.ts tests/crypto.test.ts && git commit -m "feat: symmetric crypto (AES/DES/3DES/SM4)"
```

---

## Task 3: SM3 哈希

**Files:**
- Modify: `lib/tools/hash.ts`, `tests/hash.test.ts`

- [ ] **Step 1: 补失败测试**

在 `tests/hash.test.ts` 顶部 import 增加 `sm3`，并追加：
```ts
describe('sm3', () => {
  it('hashes abc to the known vector', () => {
    expect(sm3('abc').output).toBe('66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0')
  })
})
```
（顶部 import 改为：`import { md5, sha, sm3 } from '@/lib/tools/hash'`，保留原有 sha 测试若有 async 引用不变。）

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test hash`
Expected: FAIL。

- [ ] **Step 3: 在 `lib/tools/hash.ts` 追加**

文件顶部加 import：
```ts
import { sm3 as sm3hash } from 'sm-crypto'
```
文件末尾加：
```ts
export function sm3(input: string): ToolResult {
  return ok(sm3hash(input))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test hash`
Expected: PASS。

> 若 SM3 已知向量与 sm-crypto 输出不一致，以库实际输出修正断言（保留「固定输入→固定输出」的语义）。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/hash.ts tests/hash.test.ts && git commit -m "feat: SM3 hash"
```

---

## Task 4: 类型 + 注册表

**Files:**
- Modify: `lib/tools/types.ts`, `lib/tools/registry.ts`, `tests/registry.test.ts`

- [ ] **Step 1: 补失败测试**

在 `tests/registry.test.ts` 的 `describe('registry', ...)` 内追加：
```ts
  it('registers sm3 as an io tool', () => {
    expect(findTool('sm3')!.layout).toBe('io')
    expect(typeof findTool('sm3')!.run).toBe('function')
  })
  it('registers symmetric crypto tools with crypto layout and no run', () => {
    for (const id of ['aes', 'des', 'triple-des', 'sm4']) {
      expect(findTool(id)!.layout).toBe('crypto')
      expect(findTool(id)!.run).toBeUndefined()
    }
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test registry`
Expected: FAIL。

- [ ] **Step 3: `lib/tools/types.ts` 加布局**

```ts
export type ToolLayout = 'io' | 'diff' | 'regex' | 'qrcode' | 'query' | 'crypto'
```

- [ ] **Step 4: `lib/tools/registry.ts` 注册**

import 区把 `import { md5 } from './hash'` 改为 `import { md5, sm3 } from './hash'`。

在 `TOOLS` 末尾追加：
```ts
  { id: 'sm3', category: 'crypto', name: 'SM3', keywords: ['sm3', '国密', 'hash', '哈希'], layout: 'io', run: (i) => sm3(i) },
  { id: 'aes', category: 'crypto', name: 'AES 加解密', keywords: ['aes', '加密', '解密', '对称'], layout: 'crypto' },
  { id: 'des', category: 'crypto', name: 'DES 加解密', keywords: ['des', '加密', '解密', '对称'], layout: 'crypto' },
  { id: 'triple-des', category: 'crypto', name: '3DES 加解密', keywords: ['3des', 'tripledes', '加密', '解密'], layout: 'crypto' },
  { id: 'sm4', category: 'crypto', name: 'SM4 加解密（国密）', keywords: ['sm4', '国密', '加密', '解密'], layout: 'crypto' },
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm test`
Expected: 全部通过。

- [ ] **Step 6: Commit**

```bash
git add lib/tools/types.ts lib/tools/registry.ts tests/registry.test.ts && git commit -m "feat: register crypto tools + crypto layout"
```

---

## Task 5: CryptoPanel（crypto 布局）+ App 分发

**Files:**
- Create: `components/CryptoPanel.tsx`
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 创建 `components/CryptoPanel.tsx`**

```tsx
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
```

- [ ] **Step 2: App 分发**

`entrypoints/app/App.tsx`：顶部加 `import { CryptoPanel } from '@/components/CryptoPanel'`；在 `ToolView` 的 `switch` 加：
```tsx
    case 'crypto':
      return <CryptoPanel tool={tool} />
```

- [ ] **Step 3: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过。

- [ ] **Step 4: 手动验证**

命令面板搜「AES 加解密」：加密模式输入明文 + 密钥得密文；切到解密、贴密文 + 同密钥得回明文；错误密钥提示失败。试 DES/3DES/SM4（SM4 用 32 位 hex 密钥如 `0123456789abcdeffedcba9876543210`）。SM3 在 io 下输入文本得哈希。

- [ ] **Step 5: Commit**

```bash
git add components/CryptoPanel.tsx entrypoints/app/App.tsx && git commit -m "feat: symmetric crypto panel (crypto layout)"
```

---

## Task 6: 收尾

- [ ] **Step 1: 全量校验**

Run: `pnpm test && pnpm compile && pnpm build`
Expected: 全绿。

- [ ] **Step 2: Commit（如有改动）**

```bash
git add -A && git commit -m "chore: batch-3b crypto green"
```

---

## Self-Review 备注（已核对）

- **Spec 覆盖（§11 第 3 批的加解密）**：AES/DES/3DES（Task 2 + Task 5 UI）、国密 SM3（Task 3）、SM4（Task 2 + UI）。**RSA / SM2 非对称**不在本批——需密钥对生成与公钥/私钥框，单独后续计划。
- **类型一致性**：对称工具无 `run`、`layout: 'crypto'`，由 `CryptoPanel` 按 `tool.id` 调 `crypto.ts`；SM3 是 io、有 `run`，复用 `ToolResult`。`ToolLayout` 新增 `'crypto'`。`SymAlgo` 仅 crypto.ts/CryptoPanel 共用。
- **测试策略**：对称 round-trip + 错误路径、SM3 已知向量全单测；`CryptoPanel` 以 compile+build+手动验证覆盖。
- **安全/隐私**：全部本地计算，零网络。crypto-js AES/DES 用 OpenSSL 兼容的密码短语模式（自动加盐、派生 key）；SM4 用 sm-crypto 默认（ECB，hex key），面板提示密钥格式。这是「本地开发者工具」用途（同 bejson），非生产密钥管理。
- **已知简化/留待后续**：不暴露 IV/模式/填充等高级选项（用库默认）；SM4 仅 hex key、默认模式；RSA/SM2 非对称、AES-GCM 等留作 3B 后续。命令面板自动收录新工具。
