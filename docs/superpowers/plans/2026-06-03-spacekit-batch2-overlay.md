# SpaceKit Batch 2 — 划词浮层（Selection Overlay）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Batch 2 的划词浮层——在任意网页选中文本后，通过①选区浮动按钮 ②右键菜单 ③快捷键三种触发方式，就地用 SpaceKit 的高频工具（JSON 格式化、Base64/URL/Unicode 解码、JWT 解析、时间戳转日期）处理选中文本并显示结果，全部复用既有 `lib/tools/` 纯函数。

**Architecture:** 新增一个 content script（`entrypoints/overlay.content.tsx`），用 WXT 的 `createShadowRootUi` 在 Shadow DOM 中挂载 React 浮层组件 `components/Overlay.tsx`，与宿主页面样式隔离。浮层组件自包含：监听选区 `mouseup` 显示按钮、监听 `chrome.runtime.onMessage` 响应右键菜单/快捷键、调用纯函数 `tool.run(selectedText)` 出结果。`background.ts` 负责注册右键菜单（由注册表的浮层工具子集自动生成）、处理快捷键命令、并代浮层打开标签页（content script 无 `tabs` 权限）。浮层暴露哪些工具由注册表新增的 `inOverlay` 标记驱动（声明式，新增浮层工具 = 打个标记）。

**Tech Stack:** 沿用现有栈；浮层结果区用轻量 `<pre>`（非 CodeMirror，保持注入每页的脚本精简）；新增 manifest 权限 `contextMenus` + `host_permissions: <all_urls>` + `commands`。

> **范围与依赖：** 本计划是 Batch 2 的第二部分，依赖「工具篇」(`2026-06-03-spacekit-batch2-tools.md`) 已完成的 registry/纯函数。`<all_urls>` 是商店审核敏感点——见文末 Self-Review。隐私文案（PRIVACY.md/STORE_LISTING）属上架交付物，留待后续批次。完成后产物可独立构建、加载、使用。

---

## File Structure

```
lib/tools/types.ts        ToolDef 加 inOverlay?: boolean              # Task 1
lib/tools/registry.ts     标记浮层工具 + overlayTools() 辅助           # Task 1
tests/registry.test.ts    overlayTools 断言                           # Task 1
lib/messaging.ts          background ↔ content 的消息类型（单一来源）  # Task 2
wxt.config.ts             manifest：contextMenus + <all_urls> + commands # Task 2
entrypoints/background.ts 右键菜单 + 快捷键命令 + open-app 消息         # Task 2
components/Overlay.tsx     Shadow DOM 内的浮层 React 组件               # Task 3
entrypoints/overlay.content.tsx  content script：createShadowRootUi 挂载 # Task 4
```

浮层暴露的工具（均为 io 布局、单输入→输出、`run` 已存在）：`json-format`、`base64-decode`、`url-decode`、`unicode-decode`、`jwt-decode`、`ts-to-date`。

---

## Task 1: 注册表浮层工具子集

**Files:**
- Modify: `lib/tools/types.ts`
- Modify: `lib/tools/registry.ts`
- Modify: `tests/registry.test.ts`

- [ ] **Step 1: 补失败测试**

在 `tests/registry.test.ts` 顶部 import 改为包含 `overlayTools`：
```ts
import { TOOLS, findTool, searchTools, overlayTools } from '@/lib/tools/registry'
```
在 `describe('registry', ...)` 内追加：
```ts
  it('overlayTools returns only tools flagged inOverlay, all runnable io tools', () => {
    const list = overlayTools()
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((t) => t.inOverlay === true)).toBe(true)
    expect(list.every((t) => t.layout === 'io' && typeof t.run === 'function')).toBe(true)
  })
  it('overlay set covers the high-frequency decode/parse tools', () => {
    const ids = overlayTools().map((t) => t.id)
    expect(ids).toContain('json-format')
    expect(ids).toContain('base64-decode')
    expect(ids).toContain('jwt-decode')
    expect(ids).toContain('ts-to-date')
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test registry`
Expected: FAIL（`overlayTools` 未导出）。

- [ ] **Step 3: `lib/tools/types.ts` 加字段**

把 `ToolDef` 接口的 `run?` 之前加入一个可选标记：
```ts
export interface ToolDef {
  id: string
  category: ToolCategory
  // i18n key；Batch 1 暂用中文字面量，第 9 段接入 i18n 后替换
  name: string
  keywords: string[]
  layout: ToolLayout
  // 是否在划词浮层中暴露（仅 io 布局、单输入→输出的高频工具）
  inOverlay?: boolean
  // io 布局的纯函数：输入字符串 + 选项 → 结果
  run?: (input: string, options?: Record<string, unknown>) => ToolResult
}
```

- [ ] **Step 4: `lib/tools/registry.ts` 标记 + 辅助函数**

给以下 6 个条目加 `inOverlay: true`（在各自对象里、`layout: 'io'` 之后加一项）：`json-format`、`base64-decode`、`url-decode`、`unicode-decode`、`jwt-decode`、`ts-to-date`。例如 `json-format` 改为：
```ts
  { id: 'json-format', category: 'json', name: 'JSON 格式化', keywords: ['json', 'format', '格式化', '美化'], layout: 'io', inOverlay: true, run: (i, o) => formatJson(i, o) },
```
其余 5 个同样在对应对象里加 `inOverlay: true`。

在文件末尾 `searchTools` 之后追加：
```ts
// 浮层暴露的工具子集（驱动右键菜单与浮层动作，声明式）
export function overlayTools(): ToolDef[] {
  return TOOLS.filter((t) => t.inOverlay)
}
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm test && pnpm compile`
Expected: 全部通过。

- [ ] **Step 6: Commit**

```bash
git add lib/tools/types.ts lib/tools/registry.ts tests/registry.test.ts && git commit -m "feat: overlay tool subset (inOverlay flag + overlayTools)"
```

---

## Task 2: manifest 权限 + 消息类型 + background

**Files:**
- Create: `lib/messaging.ts`
- Modify: `wxt.config.ts`
- Modify: `entrypoints/background.ts`

- [ ] **Step 1: 创建 `lib/messaging.ts`**

```ts
// background → content：让浮层就地处理选中文本
export type OverlayMessage =
  | { type: 'run-tool'; toolId: string; text: string } // 右键菜单某工具被点击
  | { type: 'toggle-overlay' } // 快捷键唤出：对当前选区显示浮层

// content → background：浮层请求打开标签页应用（content script 无 tabs 权限）
export type BgMessage = { type: 'open-app' }
```

- [ ] **Step 2: 修改 `wxt.config.ts` 的 manifest**

把 `manifest` 块替换为：
```ts
  manifest: {
    name: 'SpaceKit',
    description: 'Local-first developer toolbox. Zero network, no data collection.',
    version: '0.1.0',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'SpaceKit' },
    commands: {
      'open-app': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: '打开 SpaceKit 标签页',
      },
      'toggle-overlay': {
        suggested_key: { default: 'Alt+Shift+K' },
        description: '对选中文本唤出 SpaceKit 浮层',
      },
    },
  },
```

- [ ] **Step 3: 修改 `entrypoints/background.ts`**

整文件替换为：
```ts
import { overlayTools } from '@/lib/tools/registry'
import type { BgMessage } from '@/lib/messaging'

const PARENT_ID = 'spacekit'

export default defineBackground(() => {
  const appUrl = () => chrome.runtime.getURL('/app.html')

  // 点击图标打开标签页
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: appUrl() })
  })

  // 右键菜单：父项 + 每个浮层工具子项（由注册表自动生成）
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id: PARENT_ID, title: '用 SpaceKit 处理', contexts: ['selection'] })
      for (const t of overlayTools()) {
        chrome.contextMenus.create({
          id: `${PARENT_ID}:${t.id}`,
          parentId: PARENT_ID,
          title: t.name,
          contexts: ['selection'],
        })
      }
    })
  })

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id || typeof info.menuItemId !== 'string') return
    const prefix = `${PARENT_ID}:`
    if (!info.menuItemId.startsWith(prefix)) return
    const toolId = info.menuItemId.slice(prefix.length)
    chrome.tabs.sendMessage(tab.id, { type: 'run-tool', toolId, text: info.selectionText ?? '' })
  })

  // 快捷键
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'open-app') {
      chrome.tabs.create({ url: appUrl() })
    } else if (command === 'toggle-overlay' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'toggle-overlay' })
    }
  })

  // 浮层请求打开标签页
  chrome.runtime.onMessage.addListener((msg: BgMessage) => {
    if (msg?.type === 'open-app') chrome.tabs.create({ url: appUrl() })
  })
})
```

- [ ] **Step 4: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过；构建产物 manifest 含 `contextMenus` 权限、`host_permissions: ["<all_urls>"]`、`commands`。

- [ ] **Step 5: Commit**

```bash
git add lib/messaging.ts wxt.config.ts entrypoints/background.ts && git commit -m "feat: overlay permissions + context menu + commands (background)"
```

---

## Task 3: 浮层 React 组件

**Files:**
- Create: `components/Overlay.tsx`

> 组件自包含：监听选区 `mouseup`、监听 `chrome.runtime.onMessage`、点击外部关闭。结果区用 `<pre>`（轻量）。浮层用固定的明色 Tailwind 类（不依赖 Batch 1 的 `--ck-*` CSS 变量，因为它们定义在宿主页面外、Shadow DOM 内不一定可达）。定位用 `position: fixed` 配合选区的 `getBoundingClientRect()`（与 viewport 同坐标系）。

- [ ] **Step 1: 创建 `components/Overlay.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { overlayTools } from '@/lib/tools/registry'
import type { OverlayMessage } from '@/lib/messaging'

const TOOLS = overlayTools()
type Mode = 'hidden' | 'button' | 'panel'

export function Overlay() {
  const [mode, setMode] = useState<Mode>('hidden')
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [text, setText] = useState('')
  const [toolId, setToolId] = useState(TOOLS[0]?.id ?? '')
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const tool = TOOLS.find((t) => t.id === toolId)
  const result = tool?.run ? tool.run(text) : { ok: true, output: '' }

  // 鼠标抬起：若有选中文本且不在浮层内，显示选区按钮
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (rootRef.current && e.composedPath().includes(rootRef.current)) return
      const sel = window.getSelection()
      const value = sel?.toString().trim() ?? ''
      if (!value || !sel || sel.rangeCount === 0) {
        setMode((m) => (m === 'panel' ? m : 'hidden'))
        return
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setText(value)
      setToolId((id) => id || TOOLS[0]?.id || '')
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 })
      setMode('button')
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  // 右键菜单 / 快捷键
  useEffect(() => {
    function onMessage(msg: OverlayMessage) {
      if (msg.type === 'run-tool') {
        setText(msg.text.trim())
        if (msg.toolId) setToolId(msg.toolId)
        setPos({ x: window.innerWidth / 2 - 190, y: 72 })
        setMode('panel')
      } else if (msg.type === 'toggle-overlay') {
        const value = window.getSelection()?.toString().trim() ?? ''
        if (!value) return
        setText(value)
        setPos({ x: window.innerWidth / 2 - 190, y: 72 })
        setMode('panel')
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [])

  // 面板模式下点击外部关闭
  useEffect(() => {
    if (mode !== 'panel') return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setMode('hidden')
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [mode])

  function copy() {
    if (!result.output) return
    void navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (mode === 'hidden' || TOOLS.length === 0) return null

  return (
    <div
      ref={rootRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2147483647, transform: mode === 'button' ? 'translateX(-50%)' : 'none' }}
    >
      {mode === 'button' ? (
        <button
          type="button"
          onClick={() => setMode('panel')}
          className="flex items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg hover:bg-teal-700"
        >
          SpaceKit
        </button>
      ) : (
        <div className="w-96 overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
            <span className="text-xs font-semibold text-teal-600">SpaceKit</span>
            <div className="flex-1" />
            <button type="button" onClick={() => setMode('hidden')} className="text-zinc-400 hover:text-zinc-700" aria-label="关闭">✕</button>
          </div>
          <div className="flex flex-wrap gap-1 px-3 py-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setToolId(t.id)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  t.id === toolId ? 'bg-teal-50 text-teal-700' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <pre className={`mx-3 max-h-60 overflow-auto rounded border border-zinc-100 bg-zinc-50 p-2 font-mono text-xs whitespace-pre-wrap break-all ${result.ok ? 'text-zinc-800' : 'text-rose-600'}`}>
            {result.ok ? result.output || '（无输出）' : `✗ ${result.error?.message ?? '处理失败'}`}
          </pre>
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={copy}
              disabled={!result.ok || !result.output}
              className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            >
              {copied ? '已复制' : '复制'}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => chrome.runtime.sendMessage({ type: 'open-app' })}
              className="rounded px-2 py-1 text-[11px] font-medium text-teal-600 hover:bg-teal-50"
            >
              在标签页打开 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

Run: `pnpm compile`
Expected: 通过（此时组件尚未被引用，仅类型检查）。

- [ ] **Step 3: Commit**

```bash
git add components/Overlay.tsx && git commit -m "feat: shadow-dom overlay panel component"
```

---

## Task 4: content script（Shadow DOM 挂载）

**Files:**
- Create: `entrypoints/overlay.content.tsx`

- [ ] **Step 1: 创建 `entrypoints/overlay.content.tsx`**

```tsx
import '@/assets/tailwind.css'
import { createRoot, type Root } from 'react-dom/client'
import { Overlay } from '@/components/Overlay'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'spacekit-overlay',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        const app = document.createElement('div')
        container.append(app)
        const root = createRoot(app)
        root.render(<Overlay />)
        return root
      },
      onRemove: (root) => root?.unmount(),
    })
    ui.mount()
  },
})
```

- [ ] **Step 2: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过；`.output/chrome-mv3` 出现 content script 产物（如 `content-scripts/overlay.js`），manifest 的 `content_scripts` 匹配 `<all_urls>`。

> 若 `defineContentScript`/`createShadowRootUi` 报「未定义」：它们是 WXT auto-import，确认 `pnpm postinstall`(`wxt prepare`) 已生成 `.wxt/` 类型；必要时先跑 `pnpm wxt prepare`。若 content script 中的 JSX 报错，确认 `@wxt-dev/module-react` 已在 `wxt.config.ts` 的 `modules` 中（现状已配置）。

- [ ] **Step 3: Commit**

```bash
git add entrypoints/overlay.content.tsx && git commit -m "feat: overlay content script (createShadowRootUi)"
```

---

## Task 5: 联调 + 手动验证 + 收尾

- [ ] **Step 1: 全量校验**

Run: `pnpm test && pnpm compile && pnpm build`
Expected: 全绿。

- [ ] **Step 2: 手动验证（加载 `.output/chrome-mv3` 到 `chrome://extensions`，开启开发者模式）**

逐项确认（在任意普通网页，如一篇含 JSON/token 的页面）：
1. **选区按钮**：选中一段文本 → 选区下方冒出「SpaceKit」按钮 → 点击展开面板，默认工具对选中文本出结果；切换工具按钮结果实时变化；点「复制」「✕」正常。
2. **右键菜单**：选中文本 → 右键「用 SpaceKit 处理 → JWT 解析 / Base64 解码 …」→ 浮层面板出现并以该工具处理选中文本。
3. **快捷键**：选中文本 → 按 `Alt+Shift+K` → 浮层面板出现（若快捷键无效，到 `chrome://extensions/shortcuts` 确认/改键）；`Alt+Shift+S` 打开标签页。
4. **样式隔离**：浮层在不同网站上外观一致、不被宿主样式污染（Shadow DOM 生效）。
5. **打开标签页**：面板「在标签页打开 →」打开 SpaceKit 应用标签页。

- [ ] **Step 3: Commit（如有调整）**

```bash
git add -A && git commit -m "chore: batch-2 overlay green (build + manual verify)"
```

---

## Self-Review 备注（已核对）

- **Spec 覆盖（§5.2 / §5.3 / §7）**：三种触发齐备——选区按钮（Task 3 `mouseup`）、右键菜单（Task 2 `contextMenus`，子项由 `overlayTools()` 自动生成）、快捷键（Task 2 `commands` + Task 3 `toggle-overlay`）；Shadow DOM 隔离（Task 4 `createShadowRootUi` + `cssInjectionMode: 'ui'`）；浮层只暴露高频工具、复杂工具引导「在标签页打开」（Task 3）；复用同一套 `lib/tools/` 纯函数（`tool.run`）；background 注册菜单/快捷键/开标签页（Task 2）。
- **声明式一致性**：浮层动作、右键菜单子项都来自 `overlayTools()`（注册表 `inOverlay` 标记），新增浮层工具只需打标记，无需改 background/Overlay——符合 spec §5.4「全部由注册表自动生成」。
- **类型一致性**：`OverlayMessage`/`BgMessage` 定义于 `lib/messaging.ts`，background（发 `run-tool`/`toggle-overlay`、收 `open-app`）与 Overlay（收 `OverlayMessage`、发 `open-app`）两端共用，方向一致。`overlayTools()` 返回 `ToolDef[]`，其 `run`/`layout` 与工具篇/Batch 1 一致。
- **权限最小化与审核敏感点**：仅加 `contextMenus` + `host_permissions: <all_urls>` + `commands`。`<all_urls>` 是商店审核敏感点（spec §7）——本批采用 spec 首选方案以保证「选中即冒按钮」体验；隐私声明（零网络、零数据收集、纯本地）与降级到 `activeTab` 的备选属上架交付物，留待后续批次。浮层无任何网络请求，仅本地调用纯函数。
- **测试策略**：`overlayTools()` 有单测（Task 1）；content script / Shadow DOM UI 依赖浏览器运行时，沿用项目策略以 `compile`+`build`+手动验证覆盖（Task 5）。
- **已知简化/留待后续**：浮层结果区用 `<pre>` 而非 CodeMirror（保持注入脚本精简、避免 Shadow DOM 内编辑器集成成本）；浮层固定明色主题（不随系统深色，避免依赖宿主页面外的 `--ck-*` 变量）；`ts-to-date` 在浮层按 UTC 处理（注册表默认）；快捷键默认 `Alt+Shift+S/K`，冲突时用户在 `chrome://extensions/shortcuts` 自改。
```
