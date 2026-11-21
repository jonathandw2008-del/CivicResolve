import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { adminApiPlugin } from './server/adminApiMiddleware'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), adminApiPlugin()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase-auth': ['firebase/app', 'firebase/auth'],
          'vendor-firestore': ['firebase/firestore'],
          'vendor-recharts': ['recharts'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})
