import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message && warning.message.includes('BatchedMesh')) return;
        if (warning.message && warning.message.includes('to-fast-properties.js')) return;
        if (warning.code === 'EVAL') return;
        warn(warning);
      },
    },
    chunkSizeWarningLimit: 6000,
  },
})
