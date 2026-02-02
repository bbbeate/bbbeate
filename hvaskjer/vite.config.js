import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  plugins: [react()],
  base: '/hvaskjer/',
  server: {
    port: 1668,
    strictPort: true,
    host: '127.0.0.1'
  }
})
