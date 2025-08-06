import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/preload/dictation-status-preload.ts'),
      formats: ['cjs'],
      fileName: () => 'dictation-status-preload.js',
    },
    outDir: path.resolve(__dirname, 'dist/preload'),
    emptyOutDir: false,
    rollupOptions: {
      external: ['electron'],
      output: {
        format: 'cjs',
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
