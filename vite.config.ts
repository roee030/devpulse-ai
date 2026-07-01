import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/devpulse-ai/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react') || id.includes('/node_modules/react-dom') || id.includes('/node_modules/react-router'))
            return 'vendor-react'
          if (id.includes('/node_modules/framer-motion'))
            return 'vendor-motion'
          if (id.includes('/node_modules/recharts') || id.includes('/node_modules/d3'))
            return 'vendor-charts'
          if (id.includes('/node_modules/firebase'))
            return 'vendor-firebase'
          if (id.includes('/node_modules/@unified-api'))
            return 'vendor-unified'
          if (id.includes('/node_modules/lucide-react'))
            return 'vendor-icons'
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
