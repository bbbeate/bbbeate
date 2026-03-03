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
  base: '/astro/',
  server: {
    port: 1674,
    strictPort: true,
    host: '0.0.0.0'
  }
})
