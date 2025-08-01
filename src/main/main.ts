import * as path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { app, BrowserWindow, Menu } from 'electron';
import { initMain as initAudioLoopback } from 'electron-audio-loopback';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { AutoUpdaterService } from './auto-updater.js';
import { setupContainer, container, DI_TOKENS } from './container.js';
import type { DatabaseService } from './database.js';
import { setupIpcHandlers } from './ipc-handlers.js';
import log from './logger.js';
import type { SettingsService } from './services/settingsService.js';
import { store } from './store/store.js';

initAudioLoopback();

// Set different app name for development builds
if (process.env['NODE_ENV'] !== 'production' && !app.isPackaged) {
  app.setName('Assembly-Notes-Dev');
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 620,
    height: 380,
    minWidth: 480,
    minHeight: 220,
    title: 'Assembly Notes',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  setupContainer(mainWindow);
  setupIpcHandlers(mainWindow, store);

  console.log('🎯 About to resolve AutoUpdaterService from container');
  console.log('🎯 Environment vars:', {
    USE_LOCAL_UPDATE_SERVER: process.env['USE_LOCAL_UPDATE_SERVER'],
    UPDATE_FEED_URL: process.env['UPDATE_FEED_URL'],
  });
  const autoUpdaterService = container.resolve<AutoUpdaterService>(
    DI_TOKENS.AutoUpdaterService
  );
  console.log('🎯 Calling autoUpdaterService.init()');
  autoUpdaterService.init();

  const settingsService = container.resolve<SettingsService>(
    DI_TOKENS.SettingsService
  );
  settingsService.initializeSettings();
}

// Note: OAuth now uses temporary HTTP server instead of custom protocol

void app.whenReady().then(() => {
  log.info('App is ready, initializing...');

  createWindow();

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  console.log('🎯 About to start update check');
  const autoUpdaterService = container.resolve<AutoUpdaterService>(
    DI_TOKENS.AutoUpdaterService
  );
  autoUpdaterService.startUpdateCheck();

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
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    databaseService.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('App is quitting, closing database');
  const databaseService = container.resolve<DatabaseService>(
    DI_TOKENS.DatabaseService
  );
  databaseService.close();
});

// Prevent multiple instances
if (process.platform !== 'darwin') {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  }
}
