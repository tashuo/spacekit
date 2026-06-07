# 网页 ↔ 扩展互操作 — 设计文档

**日期:** 2026-06-06
**状态:** 已批准，待实现

## 目标

让 SpaceKit 的 Web 版与 Chrome 扩展之间能"联动"，但**不引入后端、不引入实时桥接同步、不依赖固定部署域名、不新增权限、保持零网络**。范围收敛为两块互操作功能：

1. **深链交接（扩展 → 网页）** —— 在任意网页划词后，可"在网页版打开"，网页版自动预选该工具并填入选中文本。
2. **导出 / 导入可移植状态** —— 两端都提供，用户用 JSON 文件手动搬运 history / 收藏 / 偏好。这是"共享数据"需求的离线实现（明确**不做**实时双向同步）。

设计的一个关键性质：绝大部分逻辑落在**共享代码**（`lib/`、`components/`），因此 Web 版与扩展会同时获得这些能力——导出/导入尤其是"一次实现、两端都有"。

## 决策摘要

| 维度 | 决策 |
|------|------|
| 交接传输 | URL **hash 片段**（非 query），文本不发往服务器 |
| 交接方向 | 仅 扩展 → 网页；扩展内置页的"在应用中打开"保持不变 |
| 共享数据 | 仅 导出/导入 JSON；**不做**实时桥接同步 |
| 导入语义 | **合并**（非覆盖） |
| 导出/导入 UI | 放 `HistoryPanel` 头部 |
| 网页地址 | 共享常量 `WEB_APP_URL`，默认当前 workers.dev，单点可改 |

## 架构

```
功能1 交接：
  扩展浮层(Overlay) --消息--> background --tabs.create--> WEB_APP_URL#t=..&x=..
                                                              ↓
                                            网页 App 启动解析 hash → 预选工具+填文本

功能2 导出/导入（共享，两端通用）：
  prefs store + history store  <--->  lib/store/portable.ts  <--->  JSON 文件
                                              ↑
                                  HistoryPanel 的 导出/导入 按钮
```

## 组件

### 组件 A：`lib/config.ts`（新增，共享）

```ts
// Web 版部署地址。CF 域名确定后改这一行即可。
export const WEB_APP_URL = 'https://spacekit.dangyaming.workers.dev'
```

**职责:** 单点保存 Web 版基础 URL，供扩展侧拼接深链。
**依赖:** 无。

### 组件 B：`lib/handoff.ts`（新增，共享，纯函数）

```ts
export interface HandoffPayload { toolId: string; text: string }
export function encodeHandoff(toolId: string, text: string): string  // 返回不含 '#' 的 hash 串：t=<id>&x=<base64url>
export function decodeHandoff(hash: string): HandoffPayload | null    // 解析 location.hash；无效返回 null
```

- 文本以 **base64url(UTF-8)** 编码，安全承载任意字符。
- `encodeHandoff` 将文本截断到 `MAX_HANDOFF_TEXT = 8192` 字节以内，避免 URL 过长。
- `decodeHandoff` 对缺字段 / 非法 base64 / 空 toolId 一律返回 `null`。

**职责:** 交接 payload 的编解码，与运行环境无关。
**用法:** 扩展侧 `encodeHandoff`，网页侧 `decodeHandoff`。
**依赖:** 浏览器 `btoa`/`atob` + `TextEncoder`/`TextDecoder`。

### 组件 C：网页侧读取交接（修改 `entrypoints/app/App.tsx`）

在现有启动 effect 中（当前已读 kv 的 `HANDOFF_KEY`），追加一步解析 `location.hash`：

- `const p = decodeHandoff(location.hash)`；若 `p` 且 `findTool(p.toolId)` 存在，则 `setActiveToolId`、`setHandoff(p)`、`pushRecent`，随后 `history.replaceState(null, '', location.pathname + location.search)` 抹掉 hash。
- hash 来源优先级高于 kv handoff（hash 是显式深链）。两者都无则正常空启动。
- 复用现有的 `handoff` state 与传入工具面板的预填逻辑，不另起一套。

### 组件 D：扩展侧发起交接

**消息协议（修改 `lib/messaging.ts`）** —— 扩展 `BgMessage` 增加打开网页的能力。现有：
```ts
export type BgMessage = { type: 'open-app'; toolId?: string; text?: string }
```
改为可区分目标：
```ts
export type BgMessage =
  | { type: 'open-app'; toolId?: string; text?: string }      // 内置页（现状，不变）
  | { type: 'open-web'; toolId: string; text: string }        // 网页版深链
```

**浮层（修改 `components/Overlay.tsx`）** —— 面板在"复制"动作旁新增 **"在网页版打开"** 按钮，点击发 `chrome.runtime.sendMessage({ type: 'open-web', toolId, text })`。现有"在应用中打开"逻辑保持不变。新增文案走现有 i18n（`lib/i18n/messages.ts` 加 `action.openWeb` 键，中/英）。

**后台（修改 `entrypoints/background.ts`）** —— `onMessage` 处理 `open-web`：
```ts
import { WEB_APP_URL } from '@/lib/config'
import { encodeHandoff } from '@/lib/handoff'
// ...
chrome.tabs.create({ url: `${WEB_APP_URL}#${encodeHandoff(msg.toolId, msg.text)}` })
```

### 组件 E：`lib/store/portable.ts`（新增，共享）

```ts
import { z } from 'zod'

export const PORTABLE_VERSION = 1
export const PortableSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  prefs: z.object({
    theme: z.enum(['system', 'light', 'dark']),
    lang: z.string(),
    tz: z.string(),
    favoriteToolIds: z.array(z.string()),
    recentToolIds: z.array(z.string()),
  }),
  history: z.object({
    enabled: z.boolean(),
    entries: z.array(z.object({
      id: z.string(),
      kind: z.enum(['password', 'tool']),
      toolId: z.string(),
      value: z.string(),
      input: z.string().optional(),
      ts: z.number(),
    })),
  }),
})
export type PortableState = z.infer<typeof PortableSchema>

export function buildExport(): PortableState   // 读当前 usePrefs / useHistory state
export function applyImport(raw: unknown): void // 校验 + 合并 + 持久化
```

**合并规则（`applyImport`）:**
- `history.entries`：与现有按 `id` 取并集 → 按 `ts` 倒序 → 截断到 `MAX = 50`。
- `favoriteToolIds`：并集。
- `recentToolIds`：并集后截断到 `RECENT_MAX = 6`。
- `theme` / `lang` / `tz` / `history.enabled`：以导入值覆盖。
- 校验失败（`PortableSchema.parse` 抛出）或入参非对象：抛错，**不改任何 store**。

实现上通过 prefs/history store 暴露的 setter 或新增的 `mergeImport` action 写入，并触发既有持久化（经 `kv`）。为避免在 store 外直接改内部状态，给两个 store 各加一个最小的合并 action（`prefs.importMerge(p)`、`history.importMerge(h)`），`applyImport` 调它们。

**职责:** 可移植状态的序列化、校验、合并。
**依赖:** `zod`、`usePrefs`、`useHistory`。

### 组件 F：导出/导入 UI（修改 `components/HistoryPanel.tsx`，共享）

- 头部（现有清空/删除控件附近）加两个按钮：**导出**、**导入**。
- 导出：`buildExport()` → `JSON.stringify` → `Blob` → 临时 `<a download="spacekit-backup-YYYYMMDD.json">` 点击。
- 导入：隐藏 `<input type="file" accept="application/json,.json">`；选文件后 `file.text()` → `JSON.parse` → `applyImport`。成功后面板数据刷新（store 已更新）。
- 失败：面板内联显示一条错误提示（不弹窗、不外发），状态不变。
- 文案走现有 i18n（新增 `history.export` / `history.import` / `history.importError` 键，中/英）。
- 因 `HistoryPanel` 为网页与扩展共用，两端自动获得导出/导入。

## 数据流

**交接:** 划词 → 浮层"在网页版打开" → background 拼 `WEB_APP_URL#t&x` → 新标签打开网页 → App 解析 hash 预选工具/填文本 → 清除 hash。

**导出/导入:** 按钮 → `buildExport()`（读 store）→ 下载文件；或 选文件 → `applyImport()`（校验+合并）→ store 更新 → 经 `kv` 持久化。

## 错误处理

- 交接 `decodeHandoff` 返回 `null` → 忽略 hash，正常空启动。
- 交接文本超 8KB → `encodeHandoff` 截断（划词通常很短，可接受）。
- 导入校验失败 / 文件读不出 → 内联错误提示，零状态变更。

## 测试（vitest，纯函数为主）

- `lib/handoff.test.ts`：`encode/decodeHandoff` 往返；含中文/emoji/特殊字符；畸形 hash、缺字段、非法 base64 → `null`；超长文本截断。
- `lib/store/portable.test.ts`：`buildExport` 形状；`applyImport` 合并规则（history 按 id 去重并集+截断、收藏/最近并集、prefs 覆盖）；非法输入 `applyImport` 抛错且不改 store。
- 改动后 `pnpm compile`、`pnpm test`、`pnpm build`（扩展）、`pnpm build:web` 全绿。

## 拆分与顺序

两个独立切片，各自可单独上线：

1. **导出/导入**（组件 E + F + 测试）—— 自包含、价值最高、立即满足"搬数据"。
2. **深链交接**（组件 A–D + 测试）。

## 非目标（YAGNI）

- 不做实时桥接 / 后台自动同步。
- 不做 网页 → 扩展 方向的反向触发。
- 不让扩展用网页版替代内置页。
- 不引入后端、账号、云同步。
