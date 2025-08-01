#!/usr/bin/env node

// This script launches Electron for tests, filtering out problematic flags

const { spawn } = require('child_process');
const path = require('path');

// Filter out the problematic flags that Playwright adds
const args = process.argv.slice(2).filter(arg => 
  !arg.startsWith('--remote-debugging-port') && 
  !arg.startsWith('--inspect=') &&
  arg !== '-r' &&
  !arg.includes('playwright-core/lib/server/electron/loader.js')
);

// Get electron path
const electronPath = require('electron');

// Launch electron with filtered args
const proc = spawn(electronPath, args, {
  stdio: 'inherit',
  env: process.env
});

proc.on('exit', (code) => {
  process.exit(code);
});