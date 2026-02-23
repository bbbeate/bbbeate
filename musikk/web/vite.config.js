import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: '../..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared')
    }
  },
  plugins: [react()],
  build: {
    outDir: '../static',
    emptyOutDir: true
  },
  server: {
    port: 1671,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://musikk.bbbeate.space',
        changeOrigin: true
      }
    }
  }
})
