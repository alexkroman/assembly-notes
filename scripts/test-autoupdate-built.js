#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read current version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);
const currentVersion = packageJson.version;

console.log('Starting auto-update test with built app...');
console.log(`Current app version: ${currentVersion}`);
console.log('');
console.log('Make sure you have:');
console.log('1. Started the update server: npm run dev:update-server');
console.log('2. Built the app: npm run build:mac');
console.log('3. Have a different version ZIP file in the release directory');
console.log('');

// Set environment variables to override update URL
const env = {
  ...process.env,
  // Override the update feed URL to point to local server
  UPDATE_FEED_URL: 'http://localhost:8000',
  // Enable update server override
  USE_LOCAL_UPDATE_SERVER: 'true',
  // Set log level to debug
  ELECTRON_LOG_LEVEL: 'debug',
};

// Path to the built app
const appPath = join(
  __dirname,
  '../release/mac-arm64/Assembly-Notes.app/Contents/MacOS/Assembly-Notes'
);

console.log('Starting app from:', appPath);

// Start the built app with the test configuration
const app = spawn(appPath, [], {
  env,
  stdio: 'inherit',
});

app.on('close', (code) => {
  console.log(`App process exited with code ${code}`);
});

process.on('SIGINT', () => {
  app.kill();
  process.exit();
});
