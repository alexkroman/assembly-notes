import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  const isRenderer = process.env.BUILD_TARGET === 'renderer';
  const isPreload = process.env.BUILD_TARGET === 'preload';

  // Load env file from project root
  const env = loadEnv(mode, path.resolve(__dirname), '');

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
          fileName: () => 'preload.js',
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
    envDir: '../../', // Look for .env files in project root
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: false,
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/renderer/index.html'),
        },
        external: ['audio-processor'],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
            analytics: ['posthog-js'],
          },
        },
      },
    },
    publicDir: 'public',
    logLevel: command === 'serve' ? 'info' : 'warn',
    css: {
      postcss: true,
    },
  };
});
