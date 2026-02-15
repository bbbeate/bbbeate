import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const settingsFile = path.resolve(__dirname, 'settings.json')

function settingsApi() {
  return {
    name: 'settings-api',
    configureServer(server) {
      server.middlewares.use('/api/settings', (req, res) => {
        if (req.method === 'GET') {
          try {
            const data = fs.existsSync(settingsFile) ? fs.readFileSync(settingsFile, 'utf-8') : '{}'
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch {
            res.end('{}')
          }
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            fs.writeFileSync(settingsFile, body)
            res.end('ok')
          })
        }
      })
    }
  }
}

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  plugins: [
    settingsApi(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.png'],
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
            src: '/hjemme/icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/hjemme/icon.png',
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
