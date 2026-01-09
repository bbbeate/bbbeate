import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['discoball-icon.png'],
      manifest: {
        name: 'spaces',
        short_name: 'spaces',
        description: 'disco ball spaces',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/spaces/',
        start_url: '/spaces/',
        icons: [
          {
            src: '/spaces/discoball-icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/spaces/',
  server: {
    port: 1667,
    strictPort: true,
    host: '127.0.0.1'
  }
})
