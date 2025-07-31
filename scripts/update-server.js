#!/usr/bin/env node

import { createServer } from 'http';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
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

// Use a fake high version for testing to always trigger updates
const testVersion = '99.99.99';

const server = createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`Headers:`, req.headers);

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
    // Look for any existing macOS build artifacts (any version)
    const distDir = join(__dirname, '../dist');
    let usePath = '';
    let fileExt = '';
    let actualFileName = '';

    if (existsSync(distDir)) {
      const files = readdirSync(distDir);
      // Look for any DMG or ZIP file
      const dmgFile = files.find(f => f.endsWith('.dmg') && f.includes('Assembly-Notes'));
      const zipFile = files.find(f => f.endsWith('.zip') && f.includes('Assembly-Notes'));
      
      if (dmgFile) {
        usePath = join(distDir, dmgFile);
        fileExt = 'dmg';
        actualFileName = dmgFile;
      } else if (zipFile) {
        usePath = join(distDir, zipFile);
        fileExt = 'zip';
        actualFileName = zipFile;
      }
    }

    let updateInfo;
    if (usePath) {
      const stats = statSync(usePath);
      const sha512 = createHash('sha512').update(readFileSync(usePath)).digest('base64');
      
      console.log(`Found existing build: ${actualFileName}, serving as version ${testVersion}`);
      
      // Serve the existing file but with our fake version number
      updateInfo = `version: ${testVersion}
files:
  - url: ${actualFileName}
    sha512: ${sha512}
    size: ${stats.size}
path: ${actualFileName}
sha512: ${sha512}
releaseDate: ${new Date().toISOString()}`;
    } else {
      console.log('No macOS build artifacts found. Run npm run build:mac:dev first to create a build file for testing.');
      updateInfo = `version: ${currentVersion}
releaseDate: ${new Date().toISOString()}
note: No update available - no build files found`;
    }

    res.writeHead(200, { 'Content-Type': 'text/yaml' });
    res.end(updateInfo);
    return;
  }

  // Serve actual update files and blockmap files
  if (req.url.includes('.dmg') || req.url.includes('.zip') || req.url.includes('.blockmap')) {
    const fileName = req.url.substring(1); // Remove leading slash
    const filePath = join(__dirname, '../dist', fileName);

    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      const contentType = req.url.includes('.blockmap') ? 'application/json' : 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
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
  console.log(`Current app version: ${currentVersion}`);
  console.log(`Fake test version: ${testVersion}`);
  console.log('\nTo test auto-update:');
  console.log('1. Build once: npm run build:mac:dev (only needed once)');
  console.log('2. The server will serve any existing build as version 99.99.99');
  console.log('3. Run the test: npm run test:autoupdate');
  console.log('4. No need to rebuild - reuse the same build file for all tests!');
});