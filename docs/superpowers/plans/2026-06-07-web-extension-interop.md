# 网页 ↔ 扩展互操作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SpaceKit 加两块网页↔扩展互操作能力——导出/导入可移植状态（两端共享 UI）与扩展→网页深链交接——均零网络、无新权限、不依赖固定域名。

**Architecture:** 绝大部分逻辑放在共享 `lib/` 与 `components/`，使 Web 版与扩展同时获得能力。导出/导入用共享 `portable.ts`（zod 校验 + 合并）+ store 的 `importMerge` action + `HistoryPanel` 按钮。交接用共享 `handoff.ts`（hash 编解码）+ 网页侧 `App.tsx` 读 `location.hash` + 扩展侧浮层按钮→background→`chrome.tabs.create`。

**Tech Stack:** React 18、TypeScript、Zustand、zod（已是依赖）、Vitest（happy-dom + fake-indexeddb）、WXT。

参见设计文档：`docs/superpowers/specs/2026-06-06-web-extension-interop-design.md`

---

### Task 0: 分支

- [ ] **Step 1: 从最新 main 创建分支**

Run: `git checkout main && git pull --ff-only && git checkout -b feat/interop`
Expected: `Switched to a new branch 'feat/interop'`

---

## 切片 1：导出 / 导入（自包含，最高价值）

### Task 1: 可移植状态模块 + store 合并 action

**Files:**
- Modify: `lib/store/prefs.ts`
- Modify: `lib/store/history.ts`
- Create: `lib/store/portable.ts`
- Test: `lib/store/portable.test.ts`

- [ ] **Step 1: 给 prefs store 加 `importMerge`**

在 `lib/store/prefs.ts` 的 `PrefsState` 接口里，`hydrate: () => Promise<void>` 之前加一行：
```ts
  importMerge: (p: Partial<Persisted>) => void
```
在 store 实现里，`hydrate:` 之前插入该 action：
```ts
  importMerge: (p) => {
    const cur = get()
    const favoriteToolIds = [...new Set([...cur.favoriteToolIds, ...(p.favoriteToolIds ?? [])])]
    const recentToolIds = [...new Set([...(p.recentToolIds ?? []), ...cur.recentToolIds])].slice(0, RECENT_MAX)
    const next = {
      theme: p.theme ?? cur.theme,
      lang: p.lang ?? cur.lang,
      tz: p.tz ?? cur.tz,
      favoriteToolIds,
      recentToolIds,
    }
    set(next)
    void persist(get())
  },
```

- [ ] **Step 2: 给 history store 加 `importMerge`**

在 `lib/store/history.ts` 的 `HistoryState` 接口里，`hydrate: () => Promise<void>` 之前加一行：
```ts
  importMerge: (h: { enabled: boolean; entries: HistoryEntry[] }) => void
```
在 store 实现里，`hydrate:` 之前插入该 action：
```ts
  importMerge: (h) => {
    const cur = get().entries
    const seen = new Set(cur.map((e) => e.id))
    const entries = [...cur, ...h.entries.filter((e) => !seen.has(e.id))]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX)
    const next = { enabled: h.enabled, entries }
    set(next)
    void persist(next)
  },
```

- [ ] **Step 3: 写失败的测试**

Create `lib/store/portable.test.ts`:
```ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePrefs } from './prefs'
import { useHistory, type HistoryEntry } from './history'
import { buildExport, applyImport } from './portable'

const entry = (id: string, ts: number): HistoryEntry => ({ id, kind: 'tool', toolId: 'json-format', value: id, ts })

beforeEach(() => {
  usePrefs.setState({ theme: 'dark', lang: 'system', tz: 'UTC', favoriteToolIds: [], recentToolIds: [] })
  useHistory.setState({ enabled: true, entries: [] })
})

describe('buildExport', () => {
  it('captures version 1 and current state', () => {
    usePrefs.setState({ favoriteToolIds: ['json-format'] })
    useHistory.setState({ entries: [entry('1', 100)] })
    const out = buildExport()
    expect(out.version).toBe(1)
    expect(out.prefs.favoriteToolIds).toEqual(['json-format'])
    expect(out.history.entries).toHaveLength(1)
  })
})

describe('applyImport', () => {
  it('unions favorites and overrides theme', () => {
    usePrefs.setState({ favoriteToolIds: ['a'], theme: 'dark' })
    applyImport({
      version: 1, exportedAt: 0,
      prefs: { theme: 'light', lang: 'en', tz: 'UTC', favoriteToolIds: ['b'], recentToolIds: [] },
      history: { enabled: true, entries: [] },
    })
    expect(usePrefs.getState().favoriteToolIds.sort()).toEqual(['a', 'b'])
    expect(usePrefs.getState().theme).toBe('light')
  })

  it('dedupes history by id', () => {
    useHistory.setState({ entries: [entry('1', 100)] })
    applyImport({
      version: 1, exportedAt: 0,
      prefs: { theme: 'dark', lang: 'system', tz: 'UTC', favoriteToolIds: [], recentToolIds: [] },
      history: { enabled: true, entries: [entry('1', 100), entry('2', 200)] },
    })
    const ids = useHistory.getState().entries.map((e) => e.id).sort()
    expect(ids).toEqual(['1', '2'])
  })

  it('throws on invalid input and leaves stores unchanged', () => {
    usePrefs.setState({ theme: 'dark' })
    expect(() => applyImport({ nope: true })).toThrow()
    expect(usePrefs.getState().theme).toBe('dark')
  })
})
```

- [ ] **Step 4: 运行测试，确认失败**

Run: `pnpm test -- portable`
Expected: FAIL —— 找不到模块 `./portable`。

- [ ] **Step 5: 实现 `portable.ts`**

Create `lib/store/portable.ts`:
```ts
import { z } from 'zod'
import { usePrefs } from './prefs'
import { useHistory } from './history'

export const PORTABLE_VERSION = 1

const HistoryEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(['password', 'tool']),
  toolId: z.string(),
  value: z.string(),
  input: z.string().optional(),
  ts: z.number(),
})

export const PortableSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  prefs: z.object({
    theme: z.enum(['system', 'light', 'dark']),
    lang: z.enum(['system', 'zh', 'en']),
    tz: z.string(),
    favoriteToolIds: z.array(z.string()),
    recentToolIds: z.array(z.string()),
  }),
  history: z.object({
    enabled: z.boolean(),
    entries: z.array(HistoryEntrySchema),
  }),
})
export type PortableState = z.infer<typeof PortableSchema>

// 读当前 store 状态，产出可移植快照
export function buildExport(): PortableState {
  const p = usePrefs.getState()
  const h = useHistory.getState()
  return {
    version: PORTABLE_VERSION,
    exportedAt: Date.now(),
    prefs: {
      theme: p.theme,
      lang: p.lang,
      tz: p.tz,
      favoriteToolIds: p.favoriteToolIds,
      recentToolIds: p.recentToolIds,
    },
    history: { enabled: h.enabled, entries: h.entries },
  }
}

// 校验 + 合并入库（非法输入抛错，不改任何 store）
export function applyImport(raw: unknown): void {
  const data = PortableSchema.parse(raw)
  usePrefs.getState().importMerge(data.prefs)
  useHistory.getState().importMerge(data.history)
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `pnpm test -- portable`
Expected: PASS（4 个用例全过）。

- [ ] **Step 7: 提交**

```bash
git add lib/store/prefs.ts lib/store/history.ts lib/store/portable.ts lib/store/portable.test.ts
git commit -m "feat(store): portable export/import (schema + merge actions)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 导出 / 导入 UI（HistoryPanel，两端共享）

**Files:**
- Modify: `components/HistoryPanel.tsx`
- Modify: `lib/i18n/messages.ts`

- [ ] **Step 1: 加 i18n 文案**

在 `lib/i18n/messages.ts` 的 `MESSAGES` 对象中，找到以 `'history.` 开头的若干键（如 `'history.clear'`），在其附近加入：
```ts
  'history.export': { zh: '导出', en: 'Export' },
  'history.import': { zh: '导入', en: 'Import' },
  'history.importError': { zh: '导入失败：文件格式无效', en: 'Import failed: invalid file' },
```

- [ ] **Step 2: 改 HistoryPanel 顶部 import**

把 `components/HistoryPanel.tsx` 第一行：
```ts
import { useMemo, useState } from 'react'
```
改为：
```ts
import { useMemo, useRef, useState } from 'react'
```
并在 `import { CopyIcon, TrashIcon } from '@/components/icons'` 之后加一行：
```ts
import { buildExport, applyImport } from '@/lib/store/portable'
```

- [ ] **Step 3: 加导出/导入的本地状态与处理函数**

在 `const [groupBy, setGroupBy] = useState<'tool' | 'time'>('tool')` 之后插入：
```ts
  const fileRef = useRef<HTMLInputElement>(null)
  const [importErr, setImportErr] = useState(false)

  function exportData() {
    const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    a.href = url
    a.download = `spacekit-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复导入同一文件
    if (!file) return
    try {
      applyImport(JSON.parse(await file.text()))
      setImportErr(false)
    } catch {
      setImportErr(true)
    }
  }
```

- [ ] **Step 4: 在头部 Clear 按钮前插入导出/导入按钮 + 隐藏 file input**

在 `components/HistoryPanel.tsx` 头部，找到 Clear 按钮（`onClick={clear}` 那个 `<button>`），在它**之前**插入：
```tsx
          <button
            type="button"
            onClick={exportData}
            disabled={!entries.length}
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-teal-400"
          >
            {t('history.export')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-teal-600 dark:hover:text-teal-400"
          >
            {t('history.import')}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImportFile} className="hidden" />
```
然后在头部容器（包含上述按钮的那个 `<div className="flex items-center gap-3 ...">`）的**结束 `</div>` 之后**、`<div className="flex-1 overflow-auto p-2">` 之前，插入导入错误提示：
```tsx
        {importErr && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-1.5 text-xs text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
            {t('history.importError')}
          </div>
        )}
```

- [ ] **Step 5: 类型检查 + 两端构建**

Run: `pnpm compile && pnpm build:web && pnpm build`
Expected: 类型检查通过；web 与扩展构建均成功。

- [ ] **Step 6: 提交**

```bash
git add components/HistoryPanel.tsx lib/i18n/messages.ts
git commit -m "feat(history): export/import buttons in HistoryPanel (web + extension)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 切片 2：深链交接（扩展 → 网页）

### Task 3: 共享配置 + 交接编解码

**Files:**
- Create: `lib/config.ts`
- Create: `lib/handoff.ts`
- Test: `lib/handoff.test.ts`

- [ ] **Step 1: 创建 `lib/config.ts`**

Create `lib/config.ts`:
```ts
// Web 版部署地址。CF 域名确定后改这一行即可（供扩展侧拼接深链）。
export const WEB_APP_URL = 'https://spacekit.dangyaming.workers.dev'
```

- [ ] **Step 2: 写失败的测试**

Create `lib/handoff.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { encodeHandoff, decodeHandoff } from './handoff'

describe('handoff encode/decode', () => {
  it('round-trips ascii', () => {
    const p = decodeHandoff('#' + encodeHandoff('json-format', 'hello world'))
    expect(p).toEqual({ toolId: 'json-format', text: 'hello world' })
  })

  it('round-trips unicode and emoji', () => {
    const text = '你好 🌍 <a>&"'
    const p = decodeHandoff('#' + encodeHandoff('base64-decode', text))
    expect(p).toEqual({ toolId: 'base64-decode', text })
  })

  it('accepts hash without leading #', () => {
    const p = decodeHandoff(encodeHandoff('md5', 'x'))
    expect(p?.toolId).toBe('md5')
  })

  it('returns null on empty / missing toolId / garbage', () => {
    expect(decodeHandoff('')).toBeNull()
    expect(decodeHandoff('#x=abc')).toBeNull()
    expect(decodeHandoff('#t=md5&x=@@@not-base64@@@')).toBeNull()
  })

  it('clips text over the max length', () => {
    const big = 'a'.repeat(20000)
    const p = decodeHandoff('#' + encodeHandoff('sha', big))
    expect(p!.text.length).toBe(8192)
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `pnpm test -- handoff`
Expected: FAIL —— 找不到模块 `./handoff`。

- [ ] **Step 4: 实现 `lib/handoff.ts`**

Create `lib/handoff.ts`:
```ts
export interface HandoffPayload {
  toolId: string
  text: string
}

// 文本上限（字符）；划词通常很短，超出截断以控制 URL 长度
const MAX_HANDOFF_TEXT = 8192

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// toolId + text → 不含 '#' 的 hash 串：t=<id>&x=<base64url>
export function encodeHandoff(toolId: string, text: string): string {
  const clipped = text.length > MAX_HANDOFF_TEXT ? text.slice(0, MAX_HANDOFF_TEXT) : text
  return new URLSearchParams({ t: toolId, x: toBase64Url(clipped) }).toString()
}

// 解析 location.hash；缺字段 / 非法 base64 / 空 toolId → null
export function decodeHandoff(hash: string): HandoffPayload | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (!h) return null
  const params = new URLSearchParams(h)
  const toolId = params.get('t')
  const x = params.get('x')
  if (!toolId) return null
  try {
    return { toolId, text: x ? fromBase64Url(x) : '' }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- handoff`
Expected: PASS（5 个用例全过）。

注：`@@@not-base64@@@` 含非法 base64 字符 `@`，`fromBase64Url` 里的 `atob` 会抛错 → `decodeHandoff` 捕获后返回 `null`，符合预期。

- [ ] **Step 6: 提交**

```bash
git add lib/config.ts lib/handoff.ts lib/handoff.test.ts
git commit -m "feat(handoff): shared deep-link encode/decode + WEB_APP_URL config

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 网页侧读取交接

**Files:**
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 加 import**

在 `entrypoints/app/App.tsx`，于 `import { kv } from '@/lib/store/kv'` 之后加一行：
```ts
import { decodeHandoff } from '@/lib/handoff'
```

- [ ] **Step 2: 在启动 effect 中优先解析 hash**

把启动 effect 里这段：
```ts
    // 来自浮层「在应用中打开」的交接：预选工具并填入文本，读后即清除
    void (async () => {
      const h = await kv.get<Handoff>(HANDOFF_KEY)
      if (h?.toolId && findTool(h.toolId)) {
        setActiveToolId(h.toolId)
        setHandoff(h)
        pushRecent(h.toolId)
        await kv.remove(HANDOFF_KEY)
      }
    })()
```
替换为：
```ts
    // 交接来源：① 网页深链 #t=..&x=..（优先）② 扩展内置页经 kv
    void (async () => {
      const fromHash = decodeHandoff(location.hash)
      if (fromHash && findTool(fromHash.toolId)) {
        setActiveToolId(fromHash.toolId)
        setHandoff(fromHash)
        pushRecent(fromHash.toolId)
        history.replaceState(null, '', location.pathname + location.search)
        return
      }
      const h = await kv.get<Handoff>(HANDOFF_KEY)
      if (h?.toolId && findTool(h.toolId)) {
        setActiveToolId(h.toolId)
        setHandoff(h)
        pushRecent(h.toolId)
        await kv.remove(HANDOFF_KEY)
      }
    })()
```

- [ ] **Step 3: 类型检查 + web 构建**

Run: `pnpm compile && pnpm build:web`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add entrypoints/app/App.tsx
git commit -m "feat(app): read deep-link handoff from URL hash on the web

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 扩展侧发起交接（浮层 → background → 网页）

**Files:**
- Modify: `lib/messaging.ts`
- Modify: `components/Overlay.tsx`
- Modify: `lib/i18n/messages.ts`
- Modify: `entrypoints/background.ts`

- [ ] **Step 1: 扩展 BgMessage 协议**

在 `lib/messaging.ts`，把：
```ts
export type BgMessage = { type: 'open-app'; toolId?: string; text?: string }
```
替换为：
```ts
export type BgMessage =
  | { type: 'open-app'; toolId?: string; text?: string } // 内置页（现状）
  | { type: 'open-web'; toolId: string; text: string }   // 网页版深链
```

- [ ] **Step 2: 加 i18n 文案**

在 `lib/i18n/messages.ts` 找到 `'overlay.openApp'` 键，在其后加入：
```ts
  'overlay.openWeb': { zh: '在网页版打开', en: 'Open in web' },
```

- [ ] **Step 3: 浮层加「在网页版打开」按钮**

在 `components/Overlay.tsx`，于 `openInApp` 函数之后加入：
```ts
  function openInWeb() {
    chrome.runtime.sendMessage({ type: 'open-web', toolId, text })
    setMode('hidden')
  }
```
在面板底部动作区，找到「在应用中打开」按钮（`onClick={openInApp}`），在它**之前**插入：
```tsx
            <button
              type="button"
              onClick={openInWeb}
              className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {t('overlay.openWeb')}
            </button>
```

- [ ] **Step 4: background 处理 open-web**

在 `entrypoints/background.ts` 顶部 import 区，于 `import { type BgMessage, type Handoff, HANDOFF_KEY } from '@/lib/messaging'` 之后加入：
```ts
import { WEB_APP_URL } from '@/lib/config'
import { encodeHandoff } from '@/lib/handoff'
```
把 `onMessage` 监听器：
```ts
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    const m = msg as BgMessage | undefined
    if (m?.type !== 'open-app') return
```
替换为：
```ts
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    const m = msg as BgMessage | undefined
    if (m?.type === 'open-web') {
      chrome.tabs.create({ url: `${WEB_APP_URL}#${encodeHandoff(m.toolId, m.text)}` })
      return
    }
    if (m?.type !== 'open-app') return
```
（该监听器原有的 `open-app` 后续逻辑保持不变。）

- [ ] **Step 5: 类型检查 + 扩展构建**

Run: `pnpm compile && pnpm build`
Expected: 类型检查通过；扩展构建成功输出 `.output/chrome-mv3`。

- [ ] **Step 6: 提交**

```bash
git add lib/messaging.ts components/Overlay.tsx lib/i18n/messages.ts entrypoints/background.ts
git commit -m "feat(overlay): 'Open in web' deep-link from selection overlay

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: 全量校验

**Files:** （无新增，纯校验）

- [ ] **Step 1: 类型检查**

Run: `pnpm compile`
Expected: 无错误。

- [ ] **Step 2: 单元测试**

Run: `pnpm test`
Expected: 全部 PASS（含新增 portable、handoff 测试）。

- [ ] **Step 3: 两端构建**

Run: `pnpm build && pnpm build:web`
Expected: 扩展（`.output/chrome-mv3`）与 web（`.output/web`）均成功。

---

## 部署后手动冒烟（人工，非代码任务）

- 扩展：在任意网页划词 → 浮层「在网页版打开」→ 新标签打开 Web 版且预选工具、填入选中文本、地址栏 hash 被清除。
- 导出/导入：在 Web 版历史面板导出 JSON；在扩展内置页导入该 JSON，确认 history/收藏/偏好合并生效（反向亦然）。
