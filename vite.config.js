import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: '/txyx/',
  server: {
    proxy: {
      '/txyx/api': {
        target: 'http://localhost:3001',
        rewrite: path => path.replace(/^\/txyx\/api/, ''),
      },
      '/txyx/uploads': {
        target: 'http://localhost:3001',
        rewrite: path => path.replace(/^\/txyx/, ''),
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        admin:   resolve(__dirname, 'admin.html'),
        journal: resolve(__dirname, 'journal.html'),
      }
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.jpg', '**/*.JPG', '**/*.png', '**/*.PNG', '**/*.svg'],
})
