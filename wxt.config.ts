import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'SpaceKit',
    description: 'Local-first developer toolbox. Zero network, no data collection.',
    version: '0.1.0',
    permissions: ['storage'],
    action: { default_title: 'SpaceKit' },
  },
})
