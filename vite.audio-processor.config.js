import { defineConfig } from 'vite';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [
    {
      name: 'fix-audio-processor',
      closeBundle() {
        try {
          const audioProcessorPath = 'dist/renderer/audio-processor.js';
          let content = readFileSync(audioProcessorPath, 'utf8');
          // Remove the export statement and source map comment
          content = content.replace(/export \{\};?\s*$/gm, '');
          content = content.replace(/\/\/# sourceMappingURL=.*$/gm, '');
          writeFileSync(audioProcessorPath, content);
          console.log('✓ Fixed audio-processor.js for AudioWorklet');
        } catch (error) {
          console.warn('Could not fix audio-processor.js:', error.message);
        }
      },
    },
  ],
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'src/renderer/audio-processor.ts'),
      name: 'AudioProcessor',
      fileName: 'audio-processor',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // Ensure no module syntax is included
        format: 'iife',
        globals: {},
      },
    },
  },
  logLevel: 'warn',
});
