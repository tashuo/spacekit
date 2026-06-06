import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: 'web',
  // 复用根目录的 public（提供 PWA 图标 icon/*.png）
  publicDir: resolve(__dirname, 'public'),
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon/16.png', 'icon/32.png', 'icon/48.png', 'icon/128.png'],
      manifest: {
        name: 'SpaceKit',
        short_name: 'SpaceKit',
        description:
          'Local-first developer toolbox: JSON, codec, JWT, timestamp, hash. Zero network.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon/512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: { outDir: resolve(__dirname, '.output/web'), emptyOutDir: true },
})
