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

console.log('Starting auto-update test...');
console.log(`Current app version: ${currentVersion}`);
console.log('');
console.log('Make sure you have:');
console.log('1. Started the update server: node scripts/update-server.js');
console.log('2. Built a new version with incremented version number');
console.log('');

// Set environment variables to override update URL
const env = {
  ...process.env,
  // Override the update feed URL to point to local server
  UPDATE_FEED_URL: 'http://localhost:8000',
  // Enable dev mode
  DEV_MODE: 'true',
  // Enable update server override
  USE_LOCAL_UPDATE_SERVER: 'true',
  // Set log level to debug
  ELECTRON_LOG_LEVEL: 'debug',
};

// Start electron with the test configuration
const electron = spawn('electron', ['.'], {
  env,
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
});

electron.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});

process.on('SIGINT', () => {
  electron.kill();
  process.exit();
});
