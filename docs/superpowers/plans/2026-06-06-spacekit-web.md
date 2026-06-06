# SpaceKit Web 版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在同一仓库内派生一个纯前端、可离线（PWA）的 SpaceKit Web 版，复用 `lib/tools` 与 `components`，部署到 Cloudflare Pages 零成本。

**Architecture:** 抽出一层环境无关的键值存储适配器 `kv`（扩展用 `chrome.storage.local`，Web 用 IndexedDB，运行时探测选择）；新增 `web/` 入口用独立 Vite 配置构建，复用现有 `entrypoints/app/App`；用 `vite-plugin-pwa` 生成 manifest + service worker。扩展专属文件（background / overlay content / messaging）不进 Web 构建。

**Tech Stack:** Vite 7、@vitejs/plugin-react、@tailwindcss/vite（Tailwind v4）、vite-plugin-pwa、IndexedDB、React 18、Zustand、Vitest（fake-indexeddb）。

参见设计文档：`docs/superpowers/specs/2026-06-06-spacekit-web-design.md`

---

### Task 0: 分支与依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 创建特性分支**

当前在 `main`。先开分支：

Run: `git checkout -b feat/web`
Expected: `Switched to a new branch 'feat/web'`

- [ ] **Step 2: 安装新依赖**

Run:
```bash
pnpm add -D vite @vitejs/plugin-react vite-plugin-pwa fake-indexeddb
```
Expected: 安装成功；`package.json` 的 `devDependencies` 出现这四个包。（`@tailwindcss/vite`、`react`、`react-dom`、`vitest` 已存在。）

- [ ] **Step 3: 提交**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(web): add vite + pwa toolchain deps"
```

---

### Task 1: 存储适配器 `kv`

抽象键值存储，让上层 store 与运行环境解耦。先写测试（TDD）。

**Files:**
- Create: `lib/store/kv.ts`
- Test: `lib/store/kv.test.ts`

- [ ] **Step 1: 写失败的测试**

Create `lib/store/kv.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { idbKv } from './kv'

describe('idbKv', () => {
  it('round-trips a value', async () => {
    await idbKv.set('k1', { a: 1, b: 'two' })
    const v = await idbKv.get<{ a: number; b: string }>('k1')
    expect(v).toEqual({ a: 1, b: 'two' })
  })

  it('returns undefined for a missing key', async () => {
    const v = await idbKv.get('missing')
    expect(v).toBeUndefined()
  })

  it('removes a value', async () => {
    await idbKv.set('k2', 42)
    await idbKv.remove('k2')
    const v = await idbKv.get('k2')
    expect(v).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- kv`
Expected: FAIL —— 找不到模块 `./kv` 或 `idbKv` 未定义。

- [ ] **Step 3: 实现 `kv.ts`**

Create `lib/store/kv.ts`:

```ts
// 环境无关的键值存储：扩展走 chrome.storage.local，Web 走 IndexedDB。
// 由运行时探测在模块加载时选定，上层 store 只依赖 Kv 接口。
export interface Kv {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

// ---- 扩展实现：chrome.storage.local ----
export const chromeKv: Kv = {
  async get<T>(key: string) {
    const stored = await chrome.storage.local.get(key)
    return stored?.[key] as T | undefined
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value })
  },
  async remove(key) {
    await chrome.storage.local.remove(key)
  },
}

// ---- Web 实现：IndexedDB（单 store），失败时降级为内存态 ----
const DB_NAME = 'spacekit'
const STORE = 'kv'
const mem = new Map<string, unknown>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const idbKv: Kv = {
  async get<T>(key: string) {
    try {
      return await tx<T | undefined>('readonly', (s) => s.get(key))
    } catch (e) {
      console.warn('[spacekit] idb get failed, using memory', e)
      return mem.get(key) as T | undefined
    }
  },
  async set(key, value) {
    mem.set(key, value)
    try {
      await tx('readwrite', (s) => s.put(value, key))
    } catch (e) {
      console.warn('[spacekit] idb set failed, memory only', e)
    }
  },
  async remove(key) {
    mem.delete(key)
    try {
      await tx('readwrite', (s) => s.delete(key))
    } catch (e) {
      console.warn('[spacekit] idb remove failed, memory only', e)
    }
  },
}

// ---- 运行时选择 ----
function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
}

export const kv: Kv = hasChromeStorage() ? chromeKv : idbKv
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test -- kv`
Expected: PASS（3 个用例全过）。

- [ ] **Step 5: 提交**

```bash
git add lib/store/kv.ts lib/store/kv.test.ts
git commit -m "feat(store): add environment-agnostic kv adapter (chrome.storage / IndexedDB)"
```

---

### Task 2: 迁移 prefs / history store 到 `kv`

把两个 store 的直接 `chrome.storage` 调用换成 `kv`，逻辑/KEY/数据结构不变。

**Files:**
- Modify: `lib/store/prefs.ts`
- Modify: `lib/store/history.ts`

- [ ] **Step 1: 改 `prefs.ts`**

在 `lib/store/prefs.ts` 顶部、`import type { LangPref }` 之后加入：

```ts
import { kv } from './kv'
```

把 `persist` 函数体替换为：

```ts
async function persist(p: Persisted) {
  await kv.set(KEY, {
    theme: p.theme,
    lang: p.lang,
    tz: p.tz,
    recentToolIds: p.recentToolIds,
    favoriteToolIds: p.favoriteToolIds,
  })
}
```

把 `hydrate` 中读取的两行：

```ts
    const stored = await chrome.storage?.local.get(KEY)
    const p = stored?.[KEY] as Partial<Persisted> | undefined
```

替换为：

```ts
    const p = await kv.get<Partial<Persisted>>(KEY)
```

- [ ] **Step 2: 改 `history.ts`**

在 `lib/store/history.ts` 顶部、`import { create }` 之后加入：

```ts
import { kv } from './kv'
```

把 `persist` 函数体替换为：

```ts
async function persist(s: { enabled: boolean; entries: HistoryEntry[] }) {
  await kv.set(KEY, { enabled: s.enabled, entries: s.entries })
}
```

把 `hydrate` 中读取的两行：

```ts
    const stored = await chrome.storage?.local.get(KEY)
    const h = stored?.[KEY] as { enabled?: boolean; entries?: HistoryEntry[] } | undefined
```

替换为：

```ts
    const h = await kv.get<{ enabled?: boolean; entries?: HistoryEntry[] }>(KEY)
```

- [ ] **Step 3: 类型检查 + 现有测试**

Run: `pnpm compile && pnpm test`
Expected: 类型检查通过；所有现有测试 + kv 测试 PASS。

- [ ] **Step 4: 提交**

```bash
git add lib/store/prefs.ts lib/store/history.ts
git commit -m "refactor(store): route prefs & history persistence through kv adapter"
```

---

### Task 3: 迁移 App.tsx handoff 到 `kv`

`App.tsx` 仅在 handoff 读取处用 `chrome.storage`（2 处）。改走 `kv`，Web 下该 key 不存在自然 no-op。

**Files:**
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 加 import**

在 `entrypoints/app/App.tsx` 顶部 import 区（`import { usePrefs ... }` 之后）加入：

```ts
import { kv } from '@/lib/store/kv'
```

- [ ] **Step 2: 替换 handoff 读写**

把这段（约 165–172 行）：

```ts
      const stored = await chrome.storage?.local.get(HANDOFF_KEY)
      const h = stored?.[HANDOFF_KEY] as Handoff | undefined
      if (h?.toolId && findTool(h.toolId)) {
        setActiveToolId(h.toolId)
        setHandoff(h)
        pushRecent(h.toolId)
        await chrome.storage?.local.remove(HANDOFF_KEY)
      }
```

替换为：

```ts
      const h = await kv.get<Handoff>(HANDOFF_KEY)
      if (h?.toolId && findTool(h.toolId)) {
        setActiveToolId(h.toolId)
        setHandoff(h)
        pushRecent(h.toolId)
        await kv.remove(HANDOFF_KEY)
      }
```

- [ ] **Step 3: 确认 App.tsx 不再直接引用 chrome**

Run: `grep -n "chrome\." entrypoints/app/App.tsx`
Expected: 无输出（App.tsx 已无直接 chrome 调用）。

- [ ] **Step 4: 类型检查 + 扩展构建未坏**

Run: `pnpm compile && pnpm build`
Expected: 类型检查通过；扩展构建成功输出到 `.output/chrome-mv3`。

- [ ] **Step 5: 提交**

```bash
git add entrypoints/app/App.tsx
git commit -m "refactor(app): route handoff read through kv adapter"
```

---

### Task 4: 生成 PWA 图标（192 / 512）

现有 `public/icon` 只到 128px。PWA 需要 192/512。复用既有 sharp 脚本。

**Files:**
- Modify: `scripts/gen-icons.mjs`

- [ ] **Step 1: 扩展尺寸数组**

在 `scripts/gen-icons.mjs` 把：

```js
const SIZES = [16, 32, 48, 128]
```

改为：

```js
const SIZES = [16, 32, 48, 128, 192, 512]
```

- [ ] **Step 2: 重新生成图标**

Run: `pnpm icons`
Expected: 输出包含 `✓ public/icon/192.png` 和 `✓ public/icon/512.png`。

- [ ] **Step 3: 提交**

```bash
git add scripts/gen-icons.mjs public/icon/192.png public/icon/512.png
git commit -m "feat(icons): add 192/512 px icons for PWA"
```

---

### Task 5: Web 入口 + Vite 配置 + PWA + 构建脚本

新增 `web/` 入口与独立 Vite 配置，复用现有 `App`，并接入 PWA。

**Files:**
- Create: `web/index.html`
- Create: `web/main.tsx`
- Create: `vite.web.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`（确认 `.output/` 已忽略，无需改）

- [ ] **Step 1: 创建 `web/index.html`**

Create `web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>SpaceKit</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 `web/main.tsx`**

Create `web/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client'
import '@/assets/tailwind.css'
import { App } from '@/entrypoints/app/App'

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 3: 创建 `vite.web.config.ts`**

Create `vite.web.config.ts`:

```ts
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: 'web',
  // 复用根目录的 public（提供 PWA 图标 icon/*.png）
  publicDir: resolve(__dirname, 'public'),
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon/16.png', 'icon/32.png', 'icon/48.png', 'icon/128.png'],
      manifest: {
        name: 'SpaceKit',
        short_name: 'SpaceKit',
        description:
          'Local-first developer toolbox: JSON, codec, JWT, timestamp, hash. Zero network.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon/512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { outDir: resolve(__dirname, '.output/web'), emptyOutDir: true },
})
```

- [ ] **Step 4: 加构建脚本**

在 `package.json` 的 `scripts` 中，`"zip": ...` 之后加入：

```json
    "dev:web": "vite --config vite.web.config.ts",
    "build:web": "vite build --config vite.web.config.ts",
    "preview:web": "vite preview --config vite.web.config.ts",
```

- [ ] **Step 5: 构建 Web 版**

Run: `pnpm build:web`
Expected: 构建成功，`.output/web/` 下产出 `index.html`、`assets/*`、`manifest.webmanifest`、`sw.js`（service worker）、`icon/*.png`。

- [ ] **Step 6: 本地预览冒烟**

Run: `pnpm preview:web`
Expected: 启动本地静态服务（默认 `http://localhost:4173`）。手动打开页面，确认：命令面板 `⌘/Ctrl+K` 可唤起、随便跑一个工具（如 JSON Format）有输出、刷新后主题/history 仍在（IndexedDB 生效）。确认后 Ctrl+C 退出。

- [ ] **Step 7: 提交**

```bash
git add web/ vite.web.config.ts package.json
git commit -m "feat(web): add Cloudflare-hostable PWA build sharing core tools"
```

---

### Task 6: 全量校验

确认 Web 与扩展两套构建、类型、测试都健康。

**Files:** （无新增，纯校验）

- [ ] **Step 1: 类型检查**

Run: `pnpm compile`
Expected: 无错误。

- [ ] **Step 2: 单元测试**

Run: `pnpm test`
Expected: 全部 PASS（含 kv 测试）。

- [ ] **Step 3: 扩展构建**

Run: `pnpm build`
Expected: 成功输出 `.output/chrome-mv3`（扩展功能不受影响）。

- [ ] **Step 4: Web 构建**

Run: `pnpm build:web`
Expected: 成功输出 `.output/web`，含 `sw.js` 与 `manifest.webmanifest`。

- [ ] **Step 5: 提交（如有未提交的杂项）**

```bash
git status
# 若有遗漏文件再 add/commit；否则跳过
```

---

## Cloudflare Pages 部署（实现完成后，由人工在 CF 控制台配置）

非代码任务，记录配置项：

- **Framework preset:** None（纯 Vite 静态）
- **Build command:** `pnpm build:web`
- **Build output directory:** `.output/web`
- **Root directory:** 仓库根
- **环境变量:** 无
- **后端 / Worker / KV / D1:** 无
- 单页、无客户端路由 → 不需要 SPA fallback / `_redirects`。
- 成本：$0（CF Pages 免费版静态托管）。

---

## 设计放弃的能力（Web 版无，符合预期）

任意网页划词 overlay、浏览器右键菜单、全局快捷键 —— 扩展特权，Web 版不实现。`⌘K` 命令面板与 57 个工具完整保留。
