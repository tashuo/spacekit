import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { namespaceTailwindVars } from './lib/css-namespace'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  // content script 把 Tailwind v4 CSS 注入每个页面，其中的全局 @property --tw-* 会污染
  // 宿主页面（破坏 Tailwind v3 渐变等）。cssInjectionMode:'ui' 让 content script CSS 走
  // WXT 的提取通道、绕过 Vite 的 generateBundle，故在 build:done 对产物里所有 .css 落盘改名
  // --tw- → --sk-tw-，消除命名冲突；浮层自身样式不受影响（同文件内一并改名，自洽）。
  hooks: {
    'build:done'(wxt) {
      const dir = wxt.config.outDir
      for (const name of readdirSync(dir, { recursive: true })) {
        if (typeof name !== 'string' || !name.endsWith('.css')) continue
        const p = join(dir, name)
        writeFileSync(p, namespaceTailwindVars(readFileSync(p, 'utf8')))
      }
    },
  },
  manifest: {
    // 品牌名不本地化；description 与快捷键描述走 Chrome 原生 _locales（见 public/_locales），
    // 由浏览器界面语言决定显示中/英（chrome://extensions/shortcuts 等 manifest 文案不受 app 内语言开关影响）。
    name: 'SpaceKit',
    default_locale: 'en',
    description: '__MSG_extDescription__',
    version: '0.2.1',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'SpaceKit',
      default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    },
    commands: {
      'open-app': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: '__MSG_cmdOpenApp__',
      },
      'toggle-overlay': {
        suggested_key: { default: 'Alt+Shift+K' },
        description: '__MSG_cmdToggleOverlay__',
      },
    },
  },
})
