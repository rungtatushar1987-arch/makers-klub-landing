import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './',
  publicDir: 'app/public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        app: './app/index.html'
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    historyApiFallback: {
      rewrites: [
        { from: /^\/home/, to: '/app/index.html' },
        { from: /^\/events/, to: '/app/index.html' },
        { from: /^\/network/, to: '/app/index.html' },
        { from: /^\/profile/, to: '/app/index.html' },
        { from: /^\/login/, to: '/app/index.html' },
        { from: /^\/signup/, to: '/app/index.html' },
      ]
    }
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json']
  },
  appType: 'mpa'
})
