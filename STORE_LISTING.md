# Chrome Web Store Listing

Reference copy for the Chrome Web Store submission. Keep in sync with the product.

## Name

SpaceKit — Local-first Developer Toolbox

## Summary (≤ 132 characters)

57 developer tools behind one command palette — JSON, codec, JWT, formatters & more. Purely local, zero network, no data collection.

## Category

Developer Tools

## Language

English (the in-app UI also supports Simplified Chinese, switchable at runtime).

## Single purpose

SpaceKit provides a collection of offline developer utilities (formatting, encoding/decoding, conversion, hashing, and generation) accessible through a fast command palette, with all processing performed locally in the browser.

## Detailed description

SpaceKit puts 57 everyday developer utilities behind a single, fast command palette — search-first, keyboard-first, and dark-mode-first. Everything runs entirely on your device: no network requests, no accounts, no data collection.

**Why SpaceKit**

- ⌘/Ctrl+K command palette with fuzzy search, favorites, recents, and category grouping
- Select text on any page to run a tool inline via the overlay, or from the right-click menu
- Optional, local-only history — grouped by tool or time, deletable per entry, per tool, or all at once
- Bilingual UI (English / Simplified Chinese), switchable in-app
- Light / dark / system themes
- Syntax highlighting powered by CodeMirror

**Tools included**

- JSON — format, minify, escape, unescape, diff, JSONPath query
- Convert — JSON ↔ YAML, JSON ↔ XML, JSON → CSV, JSON → TypeScript / Go / Java
- Format — SQL, CSS, HTML, JS, XML, YAML, JSON5, TOML, Markdown, INI, Properties, Dockerfile, .env, Protobuf, GraphQL, crontab, .gitignore
- Codec — Base64, URL, Unicode encode/decode, JWT decode
- Timestamp — timestamp ↔ date
- Crypto — MD5, SM3, AES, DES, 3DES, SM4, and a strong password generator
- Text — dedupe, sort, case conversion, regex tester, QR generate/decode

**Privacy first**

SpaceKit makes zero network requests. There is no analytics, no telemetry, and no remote code. Your preferences and optional history are stored only in local browser storage and never leave your device. See the privacy policy: https://github.com/tashuo/spacekit/blob/main/PRIVACY.md

## Permission justifications

Use these in the Web Store "Privacy practices" form.

- **storage** — Persist user preferences (theme, language, favorites, recents) and the optional, user-controlled history. Stored locally only.
- **contextMenus** — Provide a right-click menu to run a tool on the currently selected text.
- **Host permissions (`<all_urls>`)** — Required for the content script that powers the on-page selection overlay on whichever page the user invokes it. It reads only the user's current text selection on demand, processes it locally, and never collects, stores, or transmits page content.
- **Remote code** — Not used. All code is bundled in the extension package.
- **Data usage** — The extension does not collect or transmit any user data.

## Privacy policy URL

https://github.com/tashuo/spacekit/blob/main/PRIVACY.md
