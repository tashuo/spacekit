# 网页版提示安装扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SpaceKit 网页版上，向未安装扩展且环境合适的用户显示一个自隐藏的"装扩展"顶栏胶囊，通过 content script 握手检测扩展是否在位。

**Architecture:** 共享模块 `lib/ext-presence.ts` 定义握手协议（`ping`/`present`）、纯判定函数与收发逻辑。扩展的 overlay content script（已在所有页面运行）应答握手；网页 `InstallExtensionPill` 组件用 `detectExtension()` 检测，`shouldPromptInstall()` 决定是否渲染，链接到 `EXT_STORE_URL`（空则永不显示）。

**Tech Stack:** React 18、TypeScript、Vitest、WXT content script、`window.postMessage`。

参见设计文档：`docs/superpowers/specs/2026-06-07-web-install-extension-prompt-design.md`

---

### Task 0: 分支

- [ ] **Step 1: 从最新 main 创建分支**

Run: `git checkout main && git pull --ff-only && git checkout -b feat/install-prompt`
Expected: `Switched to a new branch 'feat/install-prompt'`

---

### Task 1: 握手模块 `lib/ext-presence.ts`

**Files:**
- Create: `lib/ext-presence.ts`
- Test: `lib/ext-presence.test.ts`

- [ ] **Step 1: 写失败的测试（纯函数）**

Create `lib/ext-presence.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isPing, isPresenceReply, shouldPromptInstall } from './ext-presence'

describe('isPing / isPresenceReply', () => {
  it('matches correct shapes', () => {
    expect(isPing({ source: 'spacekit-web', type: 'ping' })).toBe(true)
    expect(isPresenceReply({ source: 'spacekit-ext', type: 'present' })).toBe(true)
  })
  it('rejects wrong source/type/non-object', () => {
    expect(isPing({ source: 'spacekit-ext', type: 'ping' })).toBe(false)
    expect(isPresenceReply({ source: 'spacekit-ext', type: 'ping' })).toBe(false)
    expect(isPing(null)).toBe(false)
    expect(isPresenceReply('present')).toBe(false)
  })
})

describe('shouldPromptInstall', () => {
  const base = { inExtension: false, isChromium: true, hasStoreUrl: true, detected: false }
  it('true only when all conditions met', () => {
    expect(shouldPromptInstall(base)).toBe(true)
  })
  it('false if any condition flips', () => {
    expect(shouldPromptInstall({ ...base, inExtension: true })).toBe(false)
    expect(shouldPromptInstall({ ...base, isChromium: false })).toBe(false)
    expect(shouldPromptInstall({ ...base, hasStoreUrl: false })).toBe(false)
    expect(shouldPromptInstall({ ...base, detected: true })).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- ext-presence`
Expected: FAIL —— 找不到模块 `./ext-presence`。

- [ ] **Step 3: 实现 `lib/ext-presence.ts`**

Create `lib/ext-presence.ts`:
```ts
// 网页 ↔ 扩展 存在性握手。扩展 content script（已在所有页面运行）应答，
// 网页据此判断扩展是否安装，未装时提示安装。
export const PING = { source: 'spacekit-web', type: 'ping' } as const
export const PRESENT = { source: 'spacekit-ext', type: 'present' } as const

export function isPing(data: unknown): boolean {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { source?: unknown }).source === 'spacekit-web' &&
    (data as { type?: unknown }).type === 'ping'
  )
}

export function isPresenceReply(data: unknown): boolean {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { source?: unknown }).source === 'spacekit-ext' &&
    (data as { type?: unknown }).type === 'present'
  )
}

export interface PromptInputs {
  inExtension: boolean
  isChromium: boolean
  hasStoreUrl: boolean
  detected: boolean
}

// 仅当 不在扩展内 + Chromium + 配了商店地址 + 未检测到扩展 时提示
export function shouldPromptInstall(i: PromptInputs): boolean {
  return !i.inExtension && i.isChromium && i.hasStoreUrl && !i.detected
}

// 扩展 content script 调用：回应握手 + 自身加载广播一次 present
export function respondToPresencePings(): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window) return
    if (isPing(e.data)) window.postMessage(PRESENT, '*')
  })
  window.postMessage(PRESENT, '*')
}

// 网页调用：发 ping（间隔重试）+ 监听 present，超时判未装
export function detectExtension(timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    function onMsg(e: MessageEvent) {
      if (e.source === window && isPresenceReply(e.data)) finish(true)
    }
    function finish(v: boolean) {
      if (done) return
      done = true
      window.removeEventListener('message', onMsg)
      clearInterval(iv)
      clearTimeout(to)
      resolve(v)
    }
    window.addEventListener('message', onMsg)
    const ping = () => window.postMessage(PING, '*')
    ping()
    const iv = setInterval(ping, 300)
    const to = setTimeout(() => finish(false), timeoutMs)
  })
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test -- ext-presence`
Expected: PASS（2 个 describe，全过）。

- [ ] **Step 5: 提交**

```bash
git add lib/ext-presence.ts lib/ext-presence.test.ts
git commit -m "feat(interop): extension presence handshake module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 扩展侧握手应答

**Files:**
- Modify: `entrypoints/overlay.content.tsx`

- [ ] **Step 1: 在 content script 接入应答器**

在 `entrypoints/overlay.content.tsx`，把顶部：
```ts
import '@/assets/tailwind.css'
import { createRoot, type Root } from 'react-dom/client'
import { Overlay } from '@/components/Overlay'
```
改为（加一行 import）：
```ts
import '@/assets/tailwind.css'
import { createRoot, type Root } from 'react-dom/client'
import { Overlay } from '@/components/Overlay'
import { respondToPresencePings } from '@/lib/ext-presence'
```
在 `async main(ctx) {` 之后的第一行插入：
```ts
    respondToPresencePings()
```
（不改动现有 `createShadowRootUi` / `ui.mount()` 逻辑。）

- [ ] **Step 2: 类型检查 + 扩展构建**

Run: `pnpm compile && pnpm build`
Expected: 类型检查通过；扩展构建成功输出 `.output/chrome-mv3`。

- [ ] **Step 3: 提交**

```bash
git add entrypoints/overlay.content.tsx
git commit -m "feat(overlay): answer presence handshake from the web app

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 配置 + i18n + 网页胶囊组件 + 顶栏接入

**Files:**
- Modify: `lib/config.ts`
- Modify: `lib/i18n/messages.ts`
- Create: `components/InstallExtensionPill.tsx`
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 加 `EXT_STORE_URL` 配置**

在 `lib/config.ts` 末尾追加：
```ts
// Chrome 应用商店地址。扩展上架后填入；留空则网页版永不提示安装（避免死链）。
export const EXT_STORE_URL = ''
```

- [ ] **Step 2: 加 i18n 文案**

在 `lib/i18n/messages.ts` 的 `MESSAGES` 对象中，于 `'overlay.openWeb'` 键附近加入：
```ts
  'ext.install': { zh: '装扩展', en: 'Get the extension' },
```

- [ ] **Step 3: 创建 `InstallExtensionPill.tsx`**

Create `components/InstallExtensionPill.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { detectExtension, shouldPromptInstall } from '@/lib/ext-presence'
import { EXT_STORE_URL } from '@/lib/config'
import { useT } from '@/lib/i18n'

// 扩展内置页：chrome.runtime.id 存在 → 不显示胶囊
function inExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}
// 仅 Chromium 系（扩展是 Chrome MV3）才提示安装
function isChromium(): boolean {
  return typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent)
}

export function InstallExtensionPill() {
  const t = useT()
  const [detected, setDetected] = useState(false)
  const [done, setDone] = useState(false)
  const inExtension = inExtensionContext()
  const chromium = isChromium()
  const hasStoreUrl = !!EXT_STORE_URL

  useEffect(() => {
    if (inExtension || !chromium || !hasStoreUrl) {
      setDone(true)
      return
    }
    let alive = true
    void detectExtension().then((d) => {
      if (alive) {
        setDetected(d)
        setDone(true)
      }
    })
    return () => {
      alive = false
    }
  }, [inExtension, chromium, hasStoreUrl])

  if (!done) return null
  if (!shouldPromptInstall({ inExtension, isChromium: chromium, hasStoreUrl, detected })) return null

  return (
    <a
      href={EXT_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
    >
      {t('ext.install')}
    </a>
  )
}
```

- [ ] **Step 4: 在两个顶栏接入胶囊**

在 `entrypoints/app/App.tsx`，于 `import { HistoryPanel } from '@/components/HistoryPanel'` 之后加一行：
```ts
import { InstallExtensionPill } from '@/components/InstallExtensionPill'
```
文件中有两处相同的行 `          <HistoryButton onClick={() => setHistoryOpen(true)} />`（launcher 态与 tool 态顶栏）。在**这两处之前**各插入一行（用编辑器的全部替换，把每个 `<HistoryButton onClick={() => setHistoryOpen(true)} />` 前面加上 `<InstallExtensionPill />`）。替换后这两处应分别变为：
```tsx
          <InstallExtensionPill />
          <HistoryButton onClick={() => setHistoryOpen(true)} />
```
注意：两处缩进可能不同（一处 10 空格、一处 8 空格），保持各自原有缩进即可，只要 `<InstallExtensionPill />` 紧贴在对应的 `<HistoryButton .../>` 之前同级。

- [ ] **Step 5: 类型检查 + 两端构建**

Run: `pnpm compile && pnpm build:web && pnpm build`
Expected: 类型检查通过；web 与扩展构建均成功。

- [ ] **Step 6: 提交**

```bash
git add lib/config.ts lib/i18n/messages.ts components/InstallExtensionPill.tsx entrypoints/app/App.tsx
git commit -m "feat(web): self-hiding install-extension pill in the top bar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 全量校验

**Files:** （无新增，纯校验）

- [ ] **Step 1: 类型检查**

Run: `pnpm compile`
Expected: 无错误。

- [ ] **Step 2: 单元测试**

Run: `pnpm test`
Expected: 全部 PASS（含新增 ext-presence 测试）。

- [ ] **Step 3: 两端构建**

Run: `pnpm build && pnpm build:web`
Expected: 扩展（`.output/chrome-mv3`）与 web（`.output/web`）均成功。

---

## 部署后手动冒烟（人工，非代码任务）

- 先在 `lib/config.ts` 把 `EXT_STORE_URL` 填成真实商店地址（上架后）。
- 未装扩展、用 Chrome 打开网页版 → 顶栏出现"装扩展"胶囊；点击跳商店。
- 装上扩展后刷新网页版 → 胶囊在 ~1.5s 内消失（握手成功）。
- 在扩展内置页 / 非 Chromium 浏览器 / `EXT_STORE_URL` 留空 → 胶囊始终不出现。
