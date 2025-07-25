import { app, BrowserWindow } from 'electron';
import { initMain as initAudioLoopback } from 'electron-audio-loopback';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { loadSettings } from './settings.js';
import { setupIpcHandlers } from './ipc-handlers.js';
import { initAutoUpdater, startUpdateCheck } from './auto-updater.js';
import log from './logger.js';

initAudioLoopback();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    minWidth: 400,
    minHeight: 600,
    title: 'Assembly Notes',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  setupIpcHandlers(mainWindow);
  initAutoUpdater(mainWindow);
}

app.whenReady().then(() => {
  log.info('App is ready, initializing...');
  loadSettings();
  createWindow();

  // Check for updates after app is ready
  startUpdateCheck();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info('Reactivating app, creating new window');
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    log.info('All windows closed, quitting app');
    app.quit();
  }
});
