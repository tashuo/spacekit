import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    // 品牌名不本地化；description 与快捷键描述走 Chrome 原生 _locales（见 public/_locales），
    // 由浏览器界面语言决定显示中/英（chrome://extensions/shortcuts 等 manifest 文案不受 app 内语言开关影响）。
    name: 'SpaceKit',
    default_locale: 'en',
    description: '__MSG_extDescription__',
    version: '0.1.0',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'SpaceKit' },
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
