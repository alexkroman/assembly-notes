import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

// Plugin to copy assets after build
const copyAssetsPlugin = () => ({
  name: 'copy-assets',
  closeBundle() {
    // Ensure dist/renderer directory exists
    if (!existsSync('dist/renderer')) {
      mkdirSync('dist/renderer', { recursive: true });
    }

    // Copy CSS file
    try {
      copyFileSync(
        'src/renderer/assets/styles.css',
        'dist/renderer/styles.css'
      );
      console.log('✓ Copied styles.css');
    } catch (error) {
      console.warn('Could not copy styles.css:', error.message);
    }
  },
});

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
        sourcemap: process.env.NODE_ENV === 'development',
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
    plugins: [react(), copyAssetsPlugin()],
    root: 'src/renderer',
    base: './',
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: false,
      sourcemap: process.env.NODE_ENV === 'development',
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
