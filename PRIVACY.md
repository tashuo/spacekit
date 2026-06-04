# Privacy Policy

**Effective date:** 2026-06-04

SpaceKit is a local-first developer toolbox. It is built so that your data never leaves your device.

## Summary

- **No data is collected.** SpaceKit has no analytics, no telemetry, and no tracking of any kind.
- **No network requests.** All processing happens locally in your browser. SpaceKit does not contact any server, CDN, or third-party service, and bundles no remote fonts or scripts.
- **No data is transmitted or shared** with the developer or any third party — there is no server to send it to.

## What SpaceKit stores

SpaceKit stores a small amount of data **locally only**, using the browser's `chrome.storage.local`. This data stays on your device and is never uploaded.

| Data | Purpose |
|------|---------|
| Preferences | Theme, language, timezone, favorite tools, recently used tools |
| History (optional) | Outputs of tools you copy, and generated passwords — only if History is enabled |

- History is **opt-in friendly and fully under your control**: it is capped in size, can be disabled, and can be cleared per-entry, per-tool, or entirely from the History panel at any time.
- Cryptographic tools (encryption/decryption, hashing) are **excluded** from history.
- The **content you type into tools is never persisted**, except as part of the History feature described above.

Uninstalling the extension removes all locally stored data.

## Permissions and why they are needed

| Permission | Why |
|------------|-----|
| `storage` | Save your preferences and optional history locally on your device. |
| `contextMenus` | Add a right-click menu so you can run a tool on selected text. |
| Host access (`<all_urls>`) + content script | Power the on-page selection overlay: when you select text and invoke SpaceKit, it reads **only that selection**, processes it locally, and shows the result. No page content is collected, stored, or transmitted. |

SpaceKit does **not** request access to your browsing history, cookies, bookmarks, or any account.

## Your control

- Disable or clear history at any time from the History panel.
- Remove all stored data by uninstalling the extension.

## Changes to this policy

If this policy changes, the updated version will be published in this repository with a new effective date.

## Contact

Questions about privacy can be raised via the project's GitHub repository:
<https://github.com/tashuo/spacekit>
