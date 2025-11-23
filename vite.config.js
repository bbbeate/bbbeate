import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['boris.PNG'],
      manifest: {
        name: 'liste',
        short_name: 'liste',
        description: 'todo list',
        theme_color: '#b7b7ff',
        background_color: '#b7b7ff',
        display: 'standalone',
        scope: '/bbbeate/liste/',
        icons: [
          {
            src: '/bbbeate/liste/boris.PNG',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/bbbeate/liste/boris.PNG',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/bbbeate/'
})
