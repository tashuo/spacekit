# SpaceKit

**English** | [中文](./README.zh-CN.md)

[![CI](https://github.com/tashuo/spacekit/actions/workflows/ci.yml/badge.svg)](https://github.com/tashuo/spacekit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with WXT](https://img.shields.io/badge/built%20with-WXT-67d4c1.svg)](https://wxt.dev/)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6.svg?logo=typescript&logoColor=white)
![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4.svg?logo=googlechrome&logoColor=white)

> A local-first developer toolbox Chrome extension. Search-first, keyboard-first, dark-mode-first.

SpaceKit puts 57 everyday developer utilities behind a single command palette — JSON, codec, JWT, timestamps, hashing, QR, a password generator, and a broad set of code/config formatters. Everything runs **purely locally**: zero network requests, zero data collection, no telemetry.

## Highlights

- **Command palette** — a Raycast/Linear-style launcher (`⌘/Ctrl+K`) with fuzzy search, favorites, recents, and category grouping. Keyboard-first throughout.
- **57 tools across 7 categories** — see below.
- **Selection overlay & context menu** — select text on any page and run a high-frequency tool (decode, parse, format) inline, or via the right-click menu.
- **History** — optional, local-only history of tool outputs and generated passwords, groupable by tool or time, deletable per-entry / per-tool / all.
- **Bilingual UI** — Simplified Chinese and English, switchable in-app (self-built i18n, no network fonts).
- **Light / dark / system** themes, dark-first.
- **Syntax highlighting** — CodeMirror 6 with on-demand language parsers.

## Privacy

SpaceKit is designed to never exfiltrate your data:

- No network requests of any kind — all processing happens in the browser.
- No analytics, no telemetry, no remote fonts.
- Input content is never persisted, except the explicitly opt-in **History** feature (stored only in `chrome.storage.local`, capped, and clearable at any time). Cryptographic tools are excluded from history.

See the full [Privacy Policy](./PRIVACY.md).

## Tools

| Category | Tools |
|----------|-------|
| **JSON** (6) | Format, Minify, Escape, Unescape, Diff, JSONPath Query |
| **Convert** (8) | JSON ↔ YAML, JSON ↔ XML, JSON → CSV, JSON → TS / Go / Java |
| **Format** (20) | SQL, CSS, HTML, JS, XML, YAML, JSON5, TOML, Markdown, INI, Properties, Dockerfile, .env, Protobuf, GraphQL, crontab, .gitignore (format / minify where applicable) |
| **Codec** (7) | Base64, URL, Unicode encode/decode, JWT decode |
| **Timestamp** (2) | Timestamp ↔ Date |
| **Crypto** (7) | MD5, SM3, AES, DES, 3DES, SM4, Password Generator |
| **Text** (7) | Dedupe, Sort, Upper/Lower case, Regex Tester, QR Generate/Decode |

## Tech Stack

- [WXT](https://wxt.dev/) (Manifest V3) + React 18 + TypeScript
- Tailwind CSS 4
- [CodeMirror 6](https://codemirror.net/) editors with lazy-loaded language packs
- [Zustand](https://github.com/pmndrs/zustand) state, persisted to `chrome.storage.local`
- Pure-function tools with [Vitest](https://vitest.dev/) unit tests
- Heavy formatter libraries are code-split into an on-demand chunk, keeping the content script and background bundles lean

## Development

Requires [pnpm](https://pnpm.io/) and Node.js 20+.

```bash
pnpm install        # install dependencies
pnpm dev            # start the dev server (Chrome, HMR)
pnpm build          # production build → .output/chrome-mv3
pnpm zip            # build and package a distributable zip
pnpm compile        # type-check (tsc --noEmit)
pnpm test           # run unit tests (vitest)
```

### Load the unpacked extension

1. `pnpm build`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select `.output/chrome-mv3`

### Shortcuts

- `Alt+Shift+S` — open the app
- `Alt+Shift+K` — toggle the selection overlay
- `⌘/Ctrl+K` — open the command palette (inside the app)

## Web version (PWA)

The same command palette and all 57 tools also ship as a standalone, offline-capable web app that shares the extension's core code. It can be hosted as static files at **zero cost** (e.g. Cloudflare Pages) — there's no backend, since everything runs locally in the browser.

```bash
pnpm dev:web        # web dev server (Vite, HMR)
pnpm build:web      # production build → .output/web
pnpm preview:web    # preview the production build locally
```

Deploy to **Cloudflare Workers** (static assets — no Worker script, no backend). A `wrangler.jsonc` is included that serves `.output/web` as the site root.

```bash
pnpm deploy:web     # build + wrangler deploy (needs `wrangler login` once)
```

Or connect the repo in the Cloudflare dashboard (Workers → Builds) with build command `pnpm build:web`; the included `wrangler.jsonc` provides the rest. No environment variables required.

The web version persists history/preferences in IndexedDB (the extension uses `chrome.storage`), selected automatically at runtime. Because a web page can't inject into other sites, the web version does **not** include the page selection overlay, the right-click context menu, or the global shortcuts — those remain extension-only.

## License

[MIT](./LICENSE)
