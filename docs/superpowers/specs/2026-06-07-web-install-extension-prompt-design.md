# 网页版提示安装扩展 — 设计文档

**日期:** 2026-06-07
**状态:** 已批准，待实现

## 目标

在 SpaceKit **网页版**上，向尚未安装 Chrome 扩展的用户展示一个低调的"装扩展"入口，引导他们获得网页版没有的能力（任意页面划词浮层、右键菜单、全局快捷键）。要求：全程本地、无新权限、不依赖固定扩展 ID、扩展未上架时不显示死链。

## 决策摘要

| 维度 | 决策 |
|------|------|
| 检测机制 | 扩展 content script **握手**（非 externally_connectable，无需扩展 ID） |
| 提示形态 | 顶栏**低调胶囊**，仅未安装时出现，装了自动消失 |
| 显示门槛 | 仅 非扩展内 + Chromium + 已配置商店地址 + 未检测到扩展 |
| 超时 | ~1.5s 未收到握手回应判未装 |
| 商店地址 | `lib/config.ts` 新增 `EXT_STORE_URL`，默认空（空→永不提示） |

## 架构

```
扩展 content script(已在所有页面运行)
   │  收到 ping → 回 present；自身加载 → 广播一次 present
   ▼ window.postMessage
网页 detectExtension(): 发 ping(重试) + 监听 present
   │  ≤1.5s 收到 → 已装        超时 → 未装
   ▼
InstallExtensionPill: shouldPromptInstall(...) 为真才渲染胶囊 → 跳 EXT_STORE_URL
```

握手与判定逻辑集中在共享模块 `lib/ext-presence.ts`，纯函数部分可单测；扩展侧与网页侧分别引用它。

## 组件

### 组件 A：`lib/ext-presence.ts`（新增，共享）

消息常量与类型：
```ts
export const PING = { source: 'spacekit-web', type: 'ping' } as const
export const PRESENT = { source: 'spacekit-ext', type: 'present' } as const
```

纯函数（可单测）：
```ts
export function isPing(data: unknown): boolean          // data.source==='spacekit-web' && type==='ping'
export function isPresenceReply(data: unknown): boolean // data.source==='spacekit-ext' && type==='present'

export interface PromptInputs {
  inExtension: boolean
  isChromium: boolean
  hasStoreUrl: boolean
  detected: boolean
}
// 仅当 不在扩展内 + Chromium + 配了商店地址 + 未检测到扩展 时为 true
export function shouldPromptInstall(i: PromptInputs): boolean {
  return !i.inExtension && i.isChromium && i.hasStoreUrl && !i.detected
}
```

副作用函数：
```ts
// 扩展 content script 调用：回应握手 + 自身加载广播一次 present
export function respondToPresencePings(): void

// 网页调用：发 ping（间隔重试）+ 监听 present，超时判未装
export function detectExtension(timeoutMs?: number): Promise<boolean> // 默认 1500
```

- `respondToPresencePings`：`window.addEventListener('message', …)`，对来自本窗口（`e.source === window`）的 `ping` 回 `window.postMessage(PRESENT, '*')`；并在调用时立即广播一次 `PRESENT`。
- `detectExtension`：监听 `present`；`postMessage(PING)` 立即 + 每 300ms 重试；首个 `present` → resolve(true)；`timeoutMs` 到 → resolve(false)。resolve 后清理 listener / interval / timeout，幂等。

**职责:** 握手协议 + 是否提示的纯判定。
**依赖:** 浏览器 `window.postMessage`。

### 组件 B：扩展侧握手响应（修改 `entrypoints/overlay.content.tsx`）

该 content script 已 `matches: ['<all_urls>']`。在 `main(ctx)` 内调用一次：
```ts
import { respondToPresencePings } from '@/lib/ext-presence'
// …main 内：
respondToPresencePings()
```
不改动现有浮层挂载逻辑。响应器只对收到的 magic `ping` 作答，不主动骚扰非 SpaceKit 页面（除自身加载时一次广播）。

### 组件 C：网页侧胶囊（新增 `components/InstallExtensionPill.tsx`）

```tsx
export function InstallExtensionPill(): JSX.Element | null
```
- 运行时判定：
  - `inExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id`（扩展内置页为真）。
  - `isChromium = typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent)`。
  - `hasStoreUrl = !!EXT_STORE_URL`。
- `useEffect`：若 `inExtension || !isChromium || !hasStoreUrl` → 标记完成、不检测；否则 `detectExtension()` → 写入 `detected`。检测未完成前**不渲染**（避免闪烁）。
- 渲染：`shouldPromptInstall({...})` 为真时，渲染一个小胶囊 `<a href={EXT_STORE_URL} target="_blank" rel="noopener noreferrer">`，文案 `t('ext.install')`，样式与顶栏其它控件协调（teal 强调、低调）。否则返回 `null`。
- 放入 `entrypoints/app/App.tsx` 的两个顶栏（launcher 态与 tool 态），置于 `HistoryButton` 之前。自隐藏，不占常驻空间。

**职责:** 在网页版按条件展示安装入口。
**依赖:** `lib/ext-presence`、`lib/config` 的 `EXT_STORE_URL`、`lib/i18n`。

### 组件 D：配置（修改 `lib/config.ts`）

```ts
// Chrome 应用商店地址。扩展上架后填入；留空则网页版永不提示安装（避免死链）。
export const EXT_STORE_URL = ''
```

### 组件 E：i18n（修改 `lib/i18n/messages.ts`）

```ts
  'ext.install': { zh: '装扩展', en: 'Get the extension' },
```

## 数据流

网页挂载 → `InstallExtensionPill` 判定 `inExtension / isChromium / hasStoreUrl`：任一不满足 → 永不显示。否则 `detectExtension()` 发 ping、收 present；≤1.5s 收到 → 已装（隐藏）；超时 → 未装（显示胶囊，点击跳商店）。扩展若安装，其 content script 在该页面运行并应答握手。

## 错误处理 / 边界

- content script 与页面加载先后不定：页面每 300ms 重试 ping + content script 自身加载广播一次 present，双向覆盖时序。
- 非 Chromium / 扩展内置页 / `EXT_STORE_URL` 为空 → 永不显示，`detectExtension` 不运行。
- 轻微取舍：任何页面发出本协议的 magic `ping` 都能从 `present` 得知"装了 SpaceKit"（极低敏感度指纹），可接受。
- `detectExtension` resolve 后清理所有监听/定时器，组件卸载时通过 `alive` 标志忽略迟到结果。

## 测试（vitest）

- `lib/ext-presence.test.ts`：
  - `shouldPromptInstall` 真值表：仅 `{inExtension:false, isChromium:true, hasStoreUrl:true, detected:false}` 为 true；其余每个条件翻转为 false。
  - `isPing` / `isPresenceReply`：对正确 source+type 为 true；错误 source、错误 type、非对象为 false。
- 改动后 `pnpm compile`、`pnpm test`、`pnpm build`（扩展）、`pnpm build:web` 全绿。

## 非目标（YAGNI）

- 不做 externally_connectable / 扩展 ID 探测。
- 不做"已安装但版本过旧"提示。
- 不做非 Chromium 浏览器的替代引导。
- 不做关闭后记忆（胶囊本就自隐藏，无需"已关闭"状态）。
