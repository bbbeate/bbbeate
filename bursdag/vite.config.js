import { defineConfig } from 'vite'
import path from 'path'
import { resolve } from 'path'

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        year: resolve(__dirname, '2026/index.html')
      }
    }
  },
  base: '/bursdag/'
})
