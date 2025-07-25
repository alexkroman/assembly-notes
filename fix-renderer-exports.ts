import fs from 'fs';
import path from 'path';

const rendererDir = path.join(__dirname, 'dist', 'renderer');
const files = [
  'echo-cancellation.js',
  'audio-processing.js',
  'settings-modal.js',
  'auto-updater-ui.js',
  'ui.js',
  'media.js',
];

files.forEach((filename) => {
  const filePath = path.join(rendererDir, filename);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove CommonJS exports
    content = content.replace('"use strict";\n', '');
    content = content.replace(
      'Object.defineProperty(exports, "__esModule", { value: true });\n',
      ''
    );

    fs.writeFileSync(filePath, content);
    console.log(`Fixed exports in ${filename}`);
  }
});

console.log('Fixed all renderer files');