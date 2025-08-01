#!/usr/bin/env node

// This wrapper script filters out the --remote-debugging-port=0 flag
// which is incompatible with Electron 37.x but added by Playwright

const { spawn } = require('child_process');
const path = require('path');

// Get the actual Electron executable path
const electronPath =
  process.platform === 'darwin'
    ? path.join(
        __dirname,
        '../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
      )
    : process.platform === 'win32'
      ? path.join(__dirname, '../node_modules/electron/dist/electron.exe')
      : path.join(__dirname, '../node_modules/electron/dist/electron');

// Filter out the problematic flag
const args = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith('--remote-debugging-port=0'));

// If remote debugging port was requested, use a valid port
if (process.argv.some((arg) => arg.startsWith('--remote-debugging-port=0'))) {
  args.unshift('--remote-debugging-port=9222');
}

// Spawn the actual Electron process
const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code);
});
