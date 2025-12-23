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
        name: 'space',
        short_name: 'space',
        description: 'disco ball space',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        icons: [
          {
            src: '/discoball-icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/',
})
