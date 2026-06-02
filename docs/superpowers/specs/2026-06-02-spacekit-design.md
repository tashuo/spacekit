# SpaceKit — 设计文档（Design Spec）

- 日期：2026-06-02
- 状态：已通过 brainstorm 评审，待 review
- 作者：dang.ya.ming@gmail.com（与 Claude 协作）

## 1. 背景与目标

### 问题
`bejson.com` 等在线工具（JSON 格式化、编解码、加解密、时间戳、Diff 等）使用方便，但敏感数据（token、密钥、业务 JSON）在网页里处理存在被采集 / 缓存 / 泄露的风险。

### 目标
做一个 **纯本地、零网络** 的 Chrome 浏览器插件，替代 bejson 的常用工具。所有数据处理都在用户浏览器内完成，**永不发起网络请求、不收集任何数据**。

### 非目标（YAGNI）
- 不做账号、云端同步、协作。
- 不记录用户输入过的内容（除非未来明确加"历史记录"功能）。
- 不做后端服务。

## 2. 范围（功能清单）

全部 A–F 一次性纳入设计，分批实现。

**A. JSON 工具**：格式化/压缩/校验（树形折叠+语法高亮+错误行定位）、转义/去转义、JSONPath/JMESPath 查询、按 key 排序/去重、JSON Diff。

**B. JSON 转换**：JSON↔YAML、JSON→CSV/Excel、JSON→实体类（Go struct / TypeScript interface / Java class）、JSON↔XML。

**C. 编解码**：Base64（含图片 Base64）、URL、Unicode/UTF-8、JWT 解析、十六进制/二进制/进制转换。

**D. 时间戳**：时间戳↔日期（秒/毫秒、时区）。

**E. 加解密/哈希**：MD5/SHA1/SHA256、AES/DES、RSA、国密 SM2/SM3/SM4。

**F. 文本处理**：文本 Diff、正则测试、去重/排序/大小写转换、二维码生成/解析。

**形态**：A（独立标签页，主力）+ D（任意网页划词浮层）。

## 3. 核心架构原则

> **所有工具逻辑 = 纯函数，放在 `lib/tools/`，不碰 DOM、不依赖 React、力争 100% 单元测试覆盖。**
> UI 层（标签页）与划词浮层都只是这些纯函数的"调用方"。

收益：
1. **本地、零网络** —— 纯函数在浏览器内运行，数据不外发，这是替代 bejson 的根本卖点。
2. **逻辑复用** —— 标签页与浮层调用同一套函数（如 `decodeBase64()`），不存在两套实现。
3. **可测、可维护** —— 每个工具是独立纯函数，可单独理解与测试。

## 4. 技术选型

- **框架/栈**：复用 spacemind 同款 —— WXT + React 18 + Tailwind 4 + TypeScript + Zustand + Zod + vitest。本地优先、无后端、无账号。
- **编辑器**：CodeMirror 6（语法高亮、JSON 树形折叠、错误行标记、Diff 视图、正则高亮一站式）。封装成统一组件供各工具复用。
- **加解密实现**：
  - 哈希(SHA-1/256/384/512)、AES、RSA：优先用浏览器原生 **Web Crypto API**。
  - MD5：Web Crypto 不支持，引入 ~3KB 小库。
  - 国密 SM2/SM3/SM4：引入 `sm-crypto`。
  - JWT 解析：Base64 + JSON，无需引库。
- **转换库**：YAML 用 `yaml`；XML 用轻量解析库；CSV 自实现或小库；Excel 用 `xlsx`（按需懒加载，体积大）；二维码用 `qrcode`（生成）+ `jsqr`（解析）。

## 5. 组件设计

### 5.1 标签页应用（`entrypoints/app/`，React）
布局：
```
┌──────────────────────────────────────────────────────────┐
│  SpaceKit   [🔍 搜索工具]              [主题切换] [设置]    │ 顶栏
├────────────┬─────────────────────────────────────────────┤
│ A JSON     │  ┌─ 工具标题 + 工具栏 ─────────────────────┐ │
│  · 格式化   │  │ [格式化][压缩][复制][清空][示例][选项]    │ │
│  · 转义     │  ├──────────────────┬──────────────────────┤ │
│  · 查询     │  │   输入            │   输出 (只读)          │ │
│ B 转换     │  │  (CodeMirror)    │  (CodeMirror, 折叠/高亮)│ │
│ C 编解码   │  └──────────────────┴──────────────────────┘ │
│ D 时间戳   │   状态栏：✓ 合法 / ✗ 第 12 行第 5 列 语法错误  │
│ E 加解密   │                                              │
│ F 文本     │                                              │
└────────────┴─────────────────────────────────────────────┘
```
统一交互（做一次，全工具共享）：
- 顶部**工具搜索框**：输入关键字直达工具。
- 统一工具栏：复制结果、清空、塞入示例数据、选项。
- **本地记忆**：记住上次工具、主题、各工具选项（如时区）。**不记录输入内容**。
- 明暗主题，跟随系统。
- 多数工具是"输入→输出"双栏；特殊布局：Diff（左右对比）、正则测试（正则+测试文本+匹配结果三块）、二维码（文本↔图片）。外壳统一，主工作区按工具类型切换。

### 5.2 划词浮层（`entrypoints/overlay.content.ts`，content script）
- 触发：①选中文本后旁边冒出小图标按钮 ②右键菜单"用 SpaceKit 处理 → 格式化 JSON / 解码 Base64 / 解析 JWT…" ③快捷键。三者都支持。
- 使用 **Shadow DOM** 隔离，不污染宿主页面、不被其样式影响。
- 浮层只提供轻量高频操作（格式化 JSON、Base64/URL/Unicode 解码、JWT 解析、时间戳转换）；复杂工具引导"在标签页中打开"。
- 调用同一套 `lib/tools/` 纯函数。

### 5.3 后台（`entrypoints/background.ts`）
- 注册右键菜单项。
- 处理快捷键命令（打开标签页 / 唤出浮层）。
- 点击插件图标 → 打开标签页应用。

### 5.4 工具注册表（`lib/tools/registry.ts`）
一张声明式注册表，每条描述一个工具：`id`、`category(A–F)`、`i18n 名`、`布局类型(双栏/Diff/正则/二维码/…)`、`调用的纯函数`、`是否在浮层暴露`。
- 左侧导航、顶部搜索、右键菜单、浮层动作 **全部由注册表自动生成**。
- 新增工具 = 注册表加一条 + 写一个纯函数，无需改外壳。

## 6. 目录结构（WXT 约定）
```
entrypoints/
  app/                 标签页应用 (React)
  overlay.content.ts   划词浮层 content script (Shadow DOM)
  background.ts        右键菜单 / 快捷键 / 打开标签页
lib/
  tools/
    json.ts      格式化/校验/转义/查询/排序/Diff
    convert.ts   JSON↔YAML/XML、→CSV/Excel、→Go/TS/Java
    codec.ts     Base64/URL/Unicode/进制
    jwt.ts       JWT 解析
    timestamp.ts 时间戳
    crypto.ts    MD5/SHA/AES/DES/RSA/国密
    text.ts      Diff/正则/去重排序/大小写/二维码
    registry.ts  工具注册表（驱动导航+搜索+右键+浮层）
  store/         Zustand 偏好状态（持久化到 storage，不存输入内容）
components/      共享 UI（编辑器封装、双栏布局、工具栏、状态栏…）
tests/           每个 lib/tools 模块的单元测试
```

## 7. 权限（最小化）
- `storage` —— 存偏好设置（不存数据内容）。
- `contextMenus` —— 右键菜单。
- `commands` —— 快捷键。
- `host_permissions: <all_urls>` —— 划词浮层需注入任意网页。
  - 这是审核敏感点。在商店文案与 `PRIVACY.md` 中明确：**插件不发起任何网络请求、不收集任何数据，纯本地处理**。
  - 备选降级方案：用 `activeTab`（仅用户主动触发时授权），代价是浮层不能"选中即自动冒按钮"。第一版用 `<all_urls>` 保证体验，若审核有顾虑再降级。

## 8. 国际化（i18n）
- 英文为主 + 简体中文，用 WXT `messages` 机制。所有界面文案走 i18n key，与 spacemind 同规格。

## 9. 隐私与上架
- 上架 Chrome 商店、开源、多语言，与 spacemind 同规格。
- 交付物：`README.md`、`PRIVACY.md`、`STORE_LISTING.md`、商店截图素材、`LICENSE(MIT)`。
- 隐私声明核心：零网络请求、零数据收集、纯本地。

## 10. 测试策略
- 用 vitest。每个 `lib/tools/` 纯函数都有单元测试，覆盖边界：非法 JSON、空输入、超大输入、各种时区、各编解码往返一致性、加解密往返一致性等。
- UI 由纯函数 + 注册表驱动，核心逻辑集中在可测的纯函数层。

## 11. 分阶段交付计划
全部设计进本 spec，按批实现，每批可独立构建/测试/使用。

- **第 1 批（地基 + 核心）**：外壳（标签页 + 导航 + 搜索 + 主题）、`registry`、CodeMirror 封装组件、JSON 格式化/校验/转义、Base64/URL/Unicode、JWT 解析、时间戳、MD5/SHA。
- **第 2 批**：划词浮层（三种触发）、JSON↔YAML、JSON Diff、正则测试、文本处理（去重/排序/大小写）。
- **第 3 批**：JSON 查询(JSONPath/JMESPath)、JSON→实体类(Go/TS/Java)、JSON↔XML、JSON→CSV/Excel、AES/DES/RSA、国密 SM2/3/4、二维码生成/解析。

## 12. 命名
**SpaceKit**（"一套本地开发者工具箱"，与 spacemind / spacetab 成系列）。
