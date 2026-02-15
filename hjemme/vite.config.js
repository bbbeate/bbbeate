import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'hjemme',
        short_name: 'hjemme',
        description: 'Hue light control',
        theme_color: '#242424',
        background_color: '#242424',
        display: 'standalone',
        scope: '/hjemme/',
        icons: [
          {
            src: '/hjemme/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f31d.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f31d.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f31d.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/hjemme/',
  server: {
    port: 1669,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['hjemme.bbbeate.space'],
    proxy: {
      '/hue-api': {
        target: 'https://10.0.0.1',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/hue-api/, '')
      }
    }
  }
})
