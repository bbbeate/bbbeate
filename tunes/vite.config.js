import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  plugins: [react()],
  base: '/tunes/',
  server: {
    port: 1666,
    strictPort: true,
    host: '127.0.0.1'
  }
})
