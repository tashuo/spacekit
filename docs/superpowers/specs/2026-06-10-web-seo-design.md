# 网页版 SEO 优化 — 设计文档

**日期:** 2026-06-10
**状态:** 已批准，待实现

## 目标

给 SpaceKit 网页版（Vite SPA，部署在 Cloudflare Workers 静态托管）补齐 SEO 基础，让它在传统搜索与 AI 搜索（ChatGPT/Perplexity/Claude 等不执行 JS 的爬虫）里都可被发现、可被引用。范围限定为「**Meta + 静态内容块**」——不引入 SSG/预渲染管道。

## 现状（问题）

- `<title>` 仅 "SpaceKit"；**无 description / canonical / Open Graph / Twitter Card / JSON-LD**。
- **无 robots.txt / sitemap.xml / llms.txt**、无社交分享图。
- SPA 内容全靠 JS 客户端渲染 → 爬虫拿到的 `#root` 是空的；不执行 JS 的 AI 爬虫看到空白页。

## 决策摘要

| 维度 | 决策 |
|------|------|
| 数据来源 | 单源：`lib/i18n/messages.ts` 的 `tool.*`（英文名）+ `lib/config.ts` 的 `WEB_APP_URL`，构建期生成，零手抄 |
| 可爬内容 | 在 `#root` 注入**静态内容块**（h1+简介+57 工具清单），React 挂载时覆盖 |
| 产物 | 注入 head meta/OG/JSON-LD + 产出 robots.txt / sitemap.xml / llms.txt |
| AI 爬虫 | robots.txt 明确放行（GPTBot/ClaudeBot/PerplexityBot…）+ Sitemap 行 |
| 语言 | 英文为主 + 中文标语；`og:locale:alternate zh_CN` |
| 域名 | 暂用 workers.dev，所有 URL 取 `WEB_APP_URL`，换域名改一处 |

## 架构

构建期一个 Vite 插件从单一数据源生成全部 SEO 产物；纯函数 builder 与插件 IO 分离，便于单测。

```
pnpm build:web
  └─ seoPlugin（vite.web.config.ts 启用）
       ├─ transformIndexHtml: 注入 <head> 标签 + #root 静态内容块
       └─ generateBundle: 产出 robots.txt / sitemap.xml / llms.txt
  数据源: MESSAGES(tool.*) + WEB_APP_URL
```

## 组件

### 组件 A：`web/seo.ts`（新增）—— 纯 builder + 插件

纯函数（可单测，输入即数据、输出即字符串）：
- `extractToolNames(messages): string[]` —— 取 `tool.*` 的英文名（应为 57 个）。
- `buildHeadTags({ url, toolNames }): string` —— 生成：
  - `<title>`（含品牌+定位，如 "SpaceKit — Local-first developer toolbox (JSON, Base64, JWT…)"）、`meta description`、`link rel="canonical"`、`meta robots=index,follow`。
  - Open Graph：`og:title / og:description / og:type=website / og:url / og:site_name / og:image / og:locale=en_US / og:locale:alternate=zh_CN`。
  - Twitter：`summary_large_image` + title/description/image。
  - JSON-LD `<script type="application/ld+json">`：`WebApplication`（`applicationCategory: DeveloperApplication`、`operatingSystem: Any`、`offers.price: 0`、`isAccessibleForFree: true`、`featureList`=工具名、`url`、`browserRequirements`）。
- `buildContentBlock(toolNames): string` —— `#root` 的静态 HTML：`<h1>` + 简介段（点名 7 大类与隐私/本地优先卖点）+ 57 工具 `<ul>` + `<noscript>` 提示。内联深色样式，React 挂载前不丑、挂载后被覆盖。
- `buildRobots(url): string` / `buildSitemap(url): string` / `buildLlmsTxt({ url, toolNames }): string`。

插件：
- `seoPlugin(): Plugin` —— `transformIndexHtml` 把 `buildHeadTags` 注入 `<head>`（替换占位 `<title>`）、把 `buildContentBlock` 注入 `#root`；`generateBundle` 用 `this.emitFile` 产出 `robots.txt` / `sitemap.xml` / `llms.txt`。
- 插件内读取 `MESSAGES`（`../lib/i18n/messages`）与 `WEB_APP_URL`（`../lib/config`）——二者皆纯模块，构建期 Node 导入安全。

**职责:** 从单源数据生成全部 SEO 产物。
**依赖:** `lib/i18n/messages`、`lib/config`、Vite 插件 API。

### 组件 B：`vite.web.config.ts`（修改）
在 plugins 中加入 `seoPlugin()`，与现有 `react()` / `tailwindcss()` / `VitePWA()` 并存（注入的是互不冲突的不同标签/文件）。

### 组件 C：`web/index.html`（修改）
保持精简；`<title>` 作为占位由插件替换。真实 meta/内容由插件注入，避免与代码重复维护。

### 组件 D：`public/og.png`（新增素材）
1200×630 深色底 + 居中 logo（复用 `assets/icon-source.png`），**不放文字**（规避字体依赖）。用现有 sharp 脚本（`scripts/gen-icons.mjs` 同款手法，或并入其中）生成。`og:image` 指向 `/og.png`。

## 数据流

`pnpm build:web` → `seoPlugin` 读 `MESSAGES`+`WEB_APP_URL` → `transformIndexHtml` 注入 head 标签与 `#root` 内容块 → `generateBundle` 写出 `robots.txt`/`sitemap.xml`/`llms.txt`。运行时 React `createRoot` 挂载时替换 `#root` 静态内容为应用。

## 错误处理 / 边界

- 静态内容块是**真实内容**（真实工具清单），非 cloaking；展示给爬虫与用户一致。
- `WEB_APP_URL` 为唯一 URL 源；canonical/og:url/sitemap/llms 全部取它，换域名只改一处。
- `extractToolNames` 若取到非工具的 `tool.*` 噪声键，由防漂移测试（见下）兜底暴露。

## 测试（vitest 纯函数）

- `web/seo.test.ts`：
  - `buildHeadTags` 输出含 description、canonical=URL、`og:image`、JSON-LD 且 `featureList` 含工具名。
  - `buildContentBlock` 含 `<h1>` 且包含每个工具名、含 `<noscript>`。
  - `buildSitemap` 为合法 XML 且含 URL；`buildRobots` 含 `Sitemap:` 行与 URL、放行 AI 爬虫；`buildLlmsTxt` 含 URL 与工具名。
- 防漂移：导入 `lib/tools/registry`（happy-dom 下可导入），断言每个工具 `id` 都有对应 `tool.<id>` 英文名 → 确保 SEO 清单覆盖全部工具、`extractToolNames` 数量与之一致。
- 改动后 `pnpm compile`、`pnpm test`、`pnpm build:web` 全绿；构建产物含 `robots.txt`/`sitemap.xml`/`llms.txt`，`index.html` 含注入的 meta 与内容块。

## 非目标（YAGNI）

- 不做 SSG / 预渲染管道。
- 不做多 URL / 路由级 SEO（应用是单页）。
- 不涉及自定义域名（canonical 先指 workers.dev）。
- 不动扩展构建（SEO 仅针对网页版）。
