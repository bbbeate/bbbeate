import { defineConfig } from 'vite'
import path from 'path'
import { resolve } from 'path'

const serveAllehelgensaftenAtRoot = {
  name: 'serve-allehelgensaften-at-root',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/allehelgensaften' || req.url.startsWith('/allehelgensaften/')) req.url = '/bursdag' + req.url
      next()
    })
  }
}

export default defineConfig({
  envDir: '..',
  plugins: [serveAllehelgensaftenAtRoot],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        year: resolve(__dirname, '2026/index.html'),
        allehelgensaften: resolve(__dirname, 'allehelgensaften/index.html')
      }
    }
  },
  base: '/bursdag/'
})
