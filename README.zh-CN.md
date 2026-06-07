# SpaceKit

[English](./README.md) | **中文**

[![CI](https://github.com/tashuo/spacekit/actions/workflows/ci.yml/badge.svg)](https://github.com/tashuo/spacekit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with WXT](https://img.shields.io/badge/built%20with-WXT-67d4c1.svg)](https://wxt.dev/)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6.svg?logo=typescript&logoColor=white)
![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4.svg?logo=googlechrome&logoColor=white)

> 本地优先的开发者工具箱 Chrome 扩展。搜索优先、键盘优先、深色优先。

SpaceKit 把 57 个日常开发工具收纳进一个命令面板——JSON、编解码、JWT、时间戳、哈希、二维码、密码生成,以及一整套代码/配置格式化工具。一切**纯本地运行**:零网络请求、零数据收集、无遥测。

## 亮点

- **命令面板** —— Raycast / Linear 风格启动器(`⌘/Ctrl+K`),支持模糊搜索、收藏、最近使用与分类聚合,全程键盘优先。
- **7 大类共 57 个工具** —— 见下表。
- **选词浮层与右键菜单** —— 在任意网页选中文本,就地运行高频工具(解码、解析、格式化),或通过右键菜单调用。
- **历史记录** —— 可选、纯本地,记录工具输出与生成的密码,可按工具或时间聚合,支持按条 / 按工具 / 全部删除。
- **中英双语界面** —— 简体中文与英文,应用内即时切换(自建 i18n,无网络字体)。
- **浅色 / 深色 / 跟随系统** 主题,默认深色。
- **语法高亮** —— CodeMirror 6,语言解析器按需加载。

## 隐私

SpaceKit 的设计目标是绝不外发你的数据:

- 不发起任何网络请求 —— 所有处理都在浏览器本地完成。
- 无统计、无遥测、无远程字体。
- 输入内容从不持久化,唯一例外是显式开启的**历史记录**功能(仅存于 `chrome.storage.local`,有数量上限,可随时清空)。加解密类工具不计入历史。

完整说明见[隐私政策](./PRIVACY.md)。

## 工具一览

| 分类 | 工具 |
|------|------|
| **JSON**(6) | 格式化、压缩、转义、去转义、对比、JSONPath 查询 |
| **转换**(8) | JSON ↔ YAML、JSON ↔ XML、JSON → CSV、JSON → TS / Go / Java |
| **格式化**(20) | SQL、CSS、HTML、JS、XML、YAML、JSON5、TOML、Markdown、INI、Properties、Dockerfile、.env、Protobuf、GraphQL、crontab、.gitignore(部分含压缩) |
| **编解码**(7) | Base64、URL、Unicode 编解码,JWT 解析 |
| **时间戳**(2) | 时间戳 ↔ 日期 |
| **加解密**(7) | MD5、SM3、AES、DES、3DES、SM4、密码生成器 |
| **文本**(7) | 去重、排序、大小写转换、正则测试、二维码生成/解析 |

## 技术栈

- [WXT](https://wxt.dev/)(Manifest V3)+ React 18 + TypeScript
- Tailwind CSS 4
- [CodeMirror 6](https://codemirror.net/) 编辑器,语言包按需加载
- [Zustand](https://github.com/pmndrs/zustand) 状态管理,持久化到 `chrome.storage.local`
- 纯函数工具 + [Vitest](https://vitest.dev/) 单元测试
- 重型格式化库经代码分割为按需 chunk,使内容脚本与后台包保持精简

## 开发

需要 [pnpm](https://pnpm.io/) 与 Node.js 20+。

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动开发服务器(Chrome,热更新)
pnpm build          # 生产构建 → .output/chrome-mv3
pnpm zip            # 构建并打包可分发的 zip
pnpm compile        # 类型检查(tsc --noEmit)
pnpm test           # 运行单元测试(vitest)
```

### 加载未打包的扩展

1. `pnpm build`
2. 打开 `chrome://extensions`,启用**开发者模式**
3. **加载已解压的扩展程序** → 选择 `.output/chrome-mv3`

### 快捷键

- `Alt+Shift+S` —— 打开应用
- `Alt+Shift+K` —— 切换选词浮层
- `⌘/Ctrl+K` —— 打开命令面板(在应用内)

## Web 版(PWA)

同一套命令面板与全部 57 个工具也提供一个独立、可离线的 Web 版,与扩展**共用核心代码**。它是纯静态资源,可**零成本**托管(如 Cloudflare Pages)—— 没有后端,所有计算都在浏览器本地完成。

```bash
pnpm dev:web        # Web 开发服务器(Vite,热更新)
pnpm build:web      # 生产构建 → .output/web
pnpm preview:web    # 本地预览生产构建
```

部署到 **Cloudflare Workers**(静态资源 Static Assets —— 无 Worker 脚本、无后端)。仓库已含 `wrangler.jsonc`,把 `.output/web` 作为站点根目录。

```bash
pnpm deploy:web     # 构建 + wrangler deploy(首次需 `wrangler login`)
```

或在 Cloudflare 后台连接本仓库(Workers → Builds),构建命令填 `pnpm build:web`,其余由 `wrangler.jsonc` 提供。无需任何环境变量。

Web 版用 IndexedDB 持久化历史/偏好(扩展用 `chrome.storage`),运行时自动选择。由于网页无法注入到其它站点,Web 版**不含**网页选词浮层、右键菜单和全局快捷键 —— 这些仍是扩展独有能力。

## 网页 ↔ 扩展互操作

网页版与扩展彼此独立(不同来源、各自的本地存储),但有两座桥连通它们 —— 都完全本地、无后端、无需额外权限:

- **导出 / 导入** —— 网页版和扩展的历史面板都有 **导出** 与 **导入**。导出会下载一个含历史、收藏、偏好的 `spacekit-backup-*.json`;导入会合并回去(历史按 id 去重、收藏取并集)。用它在两者之间搬运或备份数据。
- **在网页版打开** —— 在网页选中文本时,扩展的选词浮层提供 **在网页版打开**,会打开托管的网页版并预选该工具、填入文本。数据走 URL 的 **hash 片段**,所以选中文本不会发往服务器。

交接用的网页地址是 `lib/config.ts` 里唯一的常量 `WEB_APP_URL` —— 域名定了改这一处即可。

## 许可证

[MIT](./LICENSE)
