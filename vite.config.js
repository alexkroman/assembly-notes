import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
  const isRenderer = process.env.BUILD_TARGET === 'renderer';
  const isPreload = process.env.BUILD_TARGET === 'preload';

  if (isPreload) {
    // Preload build configuration
    return {
      root: 'src/preload',
      build: {
        outDir: '../../dist/preload',
        emptyOutDir: false,
        lib: {
          entry: path.resolve(__dirname, 'src/preload/preload.ts'),
          name: 'preload',
          fileName: 'preload',
          formats: ['cjs'],
        },
        rollupOptions: {
          external: ['electron'],
        },
      },
      logLevel: 'warn',
    };
  }

  // Renderer build configuration (default)
  return {
    plugins: [react()],
    root: 'src/renderer',
    base: './',
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: false,
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/renderer/index.html'),
        },
        external: ['audio-processor'],
      },
    },
    publicDir: 'public',
    logLevel: 'warn',
    css: {
      postcss: true,
    },
  };
});
