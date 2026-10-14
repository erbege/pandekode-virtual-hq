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
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@dimforge/rapier3d-compat') || id.includes('@react-three/rapier')) {
              return 'vendor-physics';
            }
            if (id.includes('@react-three/postprocessing') || id.includes('postprocessing')) {
              return 'vendor-postprocessing';
            }
            if (id.includes('@react-three/drei') || id.includes('@react-three/fiber')) {
              return 'vendor-r3f';
            }
            if (id.includes('three')) {
              return 'vendor-three';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            return 'vendor-libs';
          }
        },
      },
    },
    chunkSizeWarningLimit: 4500,
  },
})
