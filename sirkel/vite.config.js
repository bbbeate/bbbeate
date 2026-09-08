import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  base: '/sirkel/',
  server: {
    port: 1680,
    strictPort: true,
    host: '0.0.0.0'
  }
})
