import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'SpaceKit',
    description: 'Local-first developer toolbox. Zero network, no data collection.',
    version: '0.1.0',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'SpaceKit' },
    commands: {
      'open-app': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: '打开 SpaceKit 标签页',
      },
      'toggle-overlay': {
        suggested_key: { default: 'Alt+Shift+K' },
        description: '对选中文本唤出 SpaceKit 浮层',
      },
    },
  },
})
