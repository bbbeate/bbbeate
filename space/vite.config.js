import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        scope: '/bbbeate/',
        icons: [
          {
            src: '/bbbeate/discoball-icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/bbbeate/',
})
