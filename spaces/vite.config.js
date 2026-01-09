import { defineConfig } from '
'
import path from 'path'

export default defineConfig({
  envDir: '..',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  base: '/spaces/',
  server: {
    port: 1667,
    strictPort: true,
    host: '127.0.0.1'
  }
})
