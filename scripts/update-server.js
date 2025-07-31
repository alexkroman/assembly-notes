#!/usr/bin/env node

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8000;
const HOST = 'localhost';

// Read package.json to get current version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
);
const currentVersion = packageJson.version;

// Simple version bumping for testing
function getNextVersion(version) {
  const parts = version.split('.');
  const patch = parseInt(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

const testVersion = getNextVersion(currentVersion);

const server = createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve update info (latest.yml, latest-mac.yml, etc.)
  if (req.url.includes('latest') && req.url.includes('.yml')) {
    // Look for macOS build artifacts
    const dmgPath = join(__dirname, '../dist', `Assembly-Notes-${testVersion}-arm64.dmg`);
    const dmgPathX64 = join(__dirname, '../dist', `Assembly-Notes-${testVersion}-x64.dmg`);
    const zipPath = join(__dirname, '../dist', `Assembly-Notes-${testVersion}-arm64-mac.zip`);
    const zipPathX64 = join(__dirname, '../dist', `Assembly-Notes-${testVersion}-x64-mac.zip`);

    let usePath = '';
    let fileExt = '';

    // Check which file exists
    if (existsSync(dmgPath)) {
      usePath = dmgPath;
      fileExt = 'dmg';
    } else if (existsSync(dmgPathX64)) {
      usePath = dmgPathX64;
      fileExt = 'dmg';
    } else if (existsSync(zipPath)) {
      usePath = zipPath;
      fileExt = 'zip';
    } else if (existsSync(zipPathX64)) {
      usePath = zipPathX64;
      fileExt = 'zip';
    }

    let updateInfo;
    if (usePath) {
      const stats = statSync(usePath);
      const sha512 = createHash('sha512').update(readFileSync(usePath)).digest('base64');
      const arch = usePath.includes('arm64') ? 'arm64' : 'x64';

      updateInfo = `version: ${testVersion}
files:
  - url: Assembly-Notes-${testVersion}-${arch}.${fileExt}
    sha512: ${sha512}
    size: ${stats.size}
path: Assembly-Notes-${testVersion}-${arch}.${fileExt}
sha512: ${sha512}
releaseDate: ${new Date().toISOString()}`;
    } else {
      console.log('No macOS build artifacts found. Run npm run build:mac first.');
      updateInfo = `version: ${currentVersion}
releaseDate: ${new Date().toISOString()}
note: No update available`;
    }

    res.writeHead(200, { 'Content-Type': 'text/yaml' });
    res.end(updateInfo);
    return;
  }

  // Serve actual update files
  if (req.url.includes('.dmg') || req.url.includes('.zip')) {
    const fileName = req.url.substring(1); // Remove leading slash
    const filePath = join(__dirname, '../dist', fileName);

    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stats.size
      });
      const stream = readFileSync(filePath);
      res.end(stream);
    } else {
      res.writeHead(404);
      res.end('File not found');
    }
    return;
  }

  // Default response
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Update server running at http://${HOST}:${PORT}`);
  console.log(`Current version: ${currentVersion}`);
  console.log(`Test version: ${testVersion}`);
  console.log('\nTo test auto-update:');
  console.log('1. Build a new version: npm run build:mac');
  console.log('2. The server will serve update info pointing to the new version');
  console.log('3. Run the app with update URL override (see test-autoupdate.js)');
});