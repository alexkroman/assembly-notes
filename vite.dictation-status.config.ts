import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'dictation-status': path.resolve(
          __dirname,
          'src/renderer/dictation-status.html'
        ),
      },
    },
    assetsInlineLimit: 0, // Don't inline assets, copy them
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  assetsInclude: ['**/*.mp3'],
});
