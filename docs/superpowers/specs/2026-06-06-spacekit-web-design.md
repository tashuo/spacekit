# SpaceKit Web 版 — 设计文档

**日期:** 2026-06-06
**状态:** 已批准，待实现

## 目标

把现有的 SpaceKit Chrome 扩展（WXT + React + 57 个本地工具）派生出一个**纯前端 Web 版**，托管在 Cloudflare Pages 上，**零成本**（无后端、无 Worker、无环境变量）。核心 `lib/tools` 与扩展**共用同一套代码**（同仓库），改一处两边生效。

## 背景与关键洞察

现有代码对扩展环境的耦合极低：

- `lib/tools/*`（57 个工具，纯函数）、`components/*`（除 `Overlay.tsx`）、`entrypoints/app/App.tsx` 几乎不依赖 `chrome.*`。
- 全部 `chrome.*` 调用归为两类：
  1. **存储** — `chrome.storage.local`，集中在 `lib/store/prefs.ts`、`lib/store/history.ts`，以及 `App.tsx` 的 handoff 读取（2 处）。
  2. **扩展专属** — `entrypoints/background.ts`、`entrypoints/overlay.content.tsx`、`components/Overlay.tsx`、`lib/messaging.ts`（contextMenus / commands / runtime messaging）。
- 两个 store 已经是干净的 `persist()` / `hydrate()` 模式，且使用**完全相同的 KV 形状**：`chrome.storage.local.get(KEY)` / `.set({ [KEY]: value })`。

因此迁移的本质只有两步：**抽一层存储适配器** + **加一个 Web 构建入口**。

## 决策摘要

| 维度 | 决策 |
|------|------|
| 代码组织 | 同仓库新增 web 入口，复用 `lib/tools` 与 `components` |
| 本地存储 | IndexedDB（web）/ chrome.storage.local（扩展），经统一适配器 |
| 离线 | 做成 PWA（manifest + service worker） |
| 托管 | Cloudflare Pages，纯静态，$0 |

## 架构

### 组件 1：存储适配器 `lib/store/kv.ts`

统一接口，让上层 store 与环境解耦：

```ts
export interface Kv {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}
```

两个实现：

- `chromeKv` — 包装 `chrome.storage.local`，行为与现状完全一致（扩展跨上下文同步不变）。
- `idbKv` — IndexedDB，单一 database + 单 object store（key → value）。

**选择策略：运行时探测。** 模块导出一个 `kv: Kv`：若 `typeof chrome !== 'undefined' && chrome.storage?.local` 存在则用 `chromeKv`，否则用 `idbKv`。

- 优点：`lib` 单一来源，无需 build-time 别名 / 双份编译；扩展行为零变化。

**职责:** 提供与环境无关的键值持久化。
**用法:** `kv.get(KEY)` / `kv.set(KEY, value)` / `kv.remove(KEY)`。
**依赖:** 浏览器 `chrome.storage` 或 `indexedDB`（二选一，运行时确定）。

### 组件 2：改造现有 store

`lib/store/prefs.ts`、`lib/store/history.ts` 内的 `persist()` 与 `hydrate()` 改为调用 `kv`，替换直接的 `chrome.storage?.local` 调用。逻辑、KEY、数据结构均不变。

`entrypoints/app/App.tsx` 的 handoff 读取（`HANDOFF_KEY`，2 处 `chrome.storage` 调用）改走 `kv`。Web 环境下该 key 永不存在 → 自然 no-op，无需条件分支。

### 组件 3：Web 入口 `web/`

- `web/index.html` — 挂载点 + 引入 `main.tsx`。
- `web/main.tsx` — `createRoot(...).render(<App />)`，直接复用 `entrypoints/app/App`。
- `vite.web.config.ts` — 独立 Vite 配置：
  - `@vitejs/plugin-react`
  - `@tailwindcss/vite`（Tailwind v4）
  - `@` 别名 → repo 根目录（与现有 `tsconfig`/WXT 一致）
  - `vite-plugin-pwa`
  - `root: 'web'`，`build.outDir: '.output/web'`

WXT 的扩展构建（`pnpm build` / `pnpm zip`）完全不动，两套构建互不干扰。

### 组件 4：PWA

`vite-plugin-pwa` 生成 manifest 与 service worker：

- 预缓存应用静态资源；CodeMirror 等懒加载 chunk 运行时缓存。
- 提供 web app manifest（名称、图标复用 `public/icon/*`、主题色 dark-first）。
- 结果：可离线使用、可"安装"到桌面，贴近扩展体验。

### 组件 5：扩展专属文件（不进 web 构建）

`entrypoints/background.ts`、`entrypoints/overlay.content.tsx`、`components/Overlay.tsx`、`lib/messaging.ts` 原样保留给扩展，不被 `web/` 入口引用，因此不进 web bundle。无需改动。

## 数据流

```
用户操作 → App / 组件 → Zustand store (prefs / history)
                                  ↓ persist()/hydrate()
                              kv (运行时探测)
                          ┌───────┴───────┐
                     chromeKv          idbKv
                  (扩展上下文)        (Web 浏览器)
```

工具计算全部在浏览器内同步/异步完成，**零网络请求**，与现状一致。

## 部署（Cloudflare Pages）

- 构建命令：`pnpm build:web`
- 输出目录：`.output/web`
- 无后端、无 Worker、无环境变量、无数据库。
- 纯静态单页应用，无客户端路由 → 不需要 SPA fallback 配置。
- 成本：$0（CF Pages 免费版静态托管 + 不限带宽足够）。

## 错误处理

- `idbKv`：IndexedDB 打开/读写失败时降级为内存态（不阻塞 UI），并在控制台告警；history/prefs 退化为「本会话有效、刷新丢失」，不影响工具可用性。
- 运行时探测保证扩展环境永远走 `chromeKv`，不受 IDB 影响。

## 测试

- 现有 `lib/tools/*` 的 vitest 用例不变。
- 新增 `lib/store/kv.test.ts`：`idbKv` 的 get/set/remove round-trip（使用 `fake-indexeddb`，或 happy-dom 提供的 IDB）。
- 现有 store 改造后，确认扩展构建（`pnpm build`）与类型检查（`pnpm compile`）仍通过。

## 新增依赖

- 运行/构建：`vite`、`@vitejs/plugin-react`、`vite-plugin-pwa`
- 开发：`fake-indexeddb`（kv 测试）

## 明确放弃的能力（Web 版无）

以下为浏览器扩展特权，Web 版物理上无法实现，设计上放弃：

1. 在任意第三方网页上**划词 overlay**（content script 注入）。
2. 浏览器**右键菜单**集成。
3. 在任意标签页生效的**全局快捷键**（`Alt+Shift+S` / `Alt+Shift+K`）。

`⌘K` 命令面板（应用内）与全部 57 个工具在 Web 版完整保留。

## 非目标（YAGNI）

- 不做账号系统、不做云同步、不做任何后端。
- 不引入客户端路由。
- 不在本期改动扩展端任何功能行为。
