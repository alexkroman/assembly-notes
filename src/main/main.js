const { app, BrowserWindow } = require('electron');
const { initMain: initAudioLoopback } = require('electron-audio-loopback');
const path = require('path');
const { loadSettings } = require('./settings.js');
const { setupIpcHandlers } = require('./ipc-handlers.js');
const { initAutoUpdater, startUpdateCheck } = require('./auto-updater.js');
const log = require('./logger.js');

// __dirname is available in CommonJS

initAudioLoopback();

let mainWindow;

function createWindow() {
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
