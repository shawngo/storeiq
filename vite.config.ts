import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// Remove: import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    // Remove: tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})