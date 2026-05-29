import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Redirect app routes to /app/index.html in dev
function appFallback() {
  return {
    name: 'app-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const appRoutes = ['/home', '/events', '/network', '/profile', '/login', '/signup',
                          '/app/home', '/app/events', '/app/network', '/app/profile', '/app/login', '/app/signup']
        if (appRoutes.some(r => req.url?.startsWith(r))) {
          req.url = '/app/index.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), appFallback()],
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
    open: '/app/index.html',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json']
  },
  appType: 'mpa'
})
