import * as path from 'path';
import { fileURLToPath } from 'url';

import * as Sentry from '@sentry/electron/main';
import dotenv from 'dotenv';
import { app, BrowserWindow, Menu } from 'electron';
import { initMain as initAudioLoopback } from 'electron-audio-loopback';

// Load environment variables from .env file
dotenv.config();

// Set different app name for development builds - MUST be done early!
if (!app.isPackaged) {
  app.setName('Assembly-Notes-Dev');
}

// Initialize Sentry only in production
const sentryDsn =
  process.env['SENTRY_DSN'] ??
  'https://fdae435c29626d7c3480f4bd5d2e9c33@o4509792651902976.ingest.us.sentry.io/4509792663764992';

// Only initialize Sentry in production (packaged app)
if (sentryDsn && app.isPackaged) {
  Sentry.init({
    dsn: sentryDsn,
    environment: 'production',
    integrations: [
      Sentry.mainProcessSessionIntegration(),
      Sentry.electronBreadcrumbsIntegration(),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration(),
    ],
  });
} else {
  // In development, disable Sentry by providing an empty DSN
  Sentry.init({
    dsn: '',
    enabled: false,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import type { AutoUpdaterService } from './auto-updater.js';
import { setupContainer, container, DI_TOKENS } from './container.js';
import type { DatabaseService } from './database.js';
import type { DictationStatusWindow } from './dictationStatusWindow.js';
import { setupIpcHandlers } from './ipc-handlers.js';
import log from './logger.js';
import type { DictationService } from './services/dictationService.js';
import type { SettingsService } from './services/settingsService.js';
import { store } from './store/store.js';

// Log app name for debugging
log.info('Development mode:', !app.isPackaged);
log.info('App name:', app.getName());

initAudioLoopback();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 620,
    height: 380,
    minWidth: 480,
    minHeight: 220,
    title: 'Assembly-Notes',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Set up the container and IPC handlers before loading the renderer
  setupContainer(mainWindow);
  setupIpcHandlers(mainWindow, store);

  // Set Content Security Policy based on environment
  const isDevelopment = process.env['NODE_ENV'] !== 'production';
  if (!isDevelopment) {
    // Production CSP - more restrictive
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.assemblyai.com wss://api.assemblyai.com",
            ],
          },
        });
      }
    );
  }

  // Now load the renderer - IPC handlers are ready
  void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  log.info('🎯 About to resolve AutoUpdaterService from container');
  log.info('🎯 Environment vars:', {
    USE_LOCAL_UPDATE_SERVER: process.env['USE_LOCAL_UPDATE_SERVER'],
    UPDATE_FEED_URL: process.env['UPDATE_FEED_URL'],
  });
  const autoUpdaterService = container.resolve<AutoUpdaterService>(
    DI_TOKENS.AutoUpdaterService
  );
  log.info('🎯 Calling autoUpdaterService.init()');
  autoUpdaterService.init();

  const settingsService = container.resolve<SettingsService>(
    DI_TOKENS.SettingsService
  );
  settingsService.initializeSettings();

  // Set user ID in Sentry
  const settings = settingsService.getSettings();
  if (settings.userId) {
    log.info(`Setting Sentry user ID: ${settings.userId}`);
    Sentry.setUser({ id: settings.userId });
  }

  // Initialize dictation service
  const dictationService = container.resolve<DictationService>(
    DI_TOKENS.DictationService
  );
  dictationService.initialize();

  // Show main window first to ensure app activation
  mainWindow.show();

  // Create dictation status window (skip in test environment)
  if (process.env['NODE_ENV'] !== 'test') {
    const dictationStatusWindow = container.resolve<DictationStatusWindow>(
      DI_TOKENS.DictationStatusWindow
    );
    dictationStatusWindow.create();
    dictationStatusWindow.show();
  }
}

// Note: OAuth now uses temporary HTTP server instead of custom protocol

void app.whenReady().then(() => {
  log.info('App is ready, initializing...');

  // Activate the app on macOS to ensure dock icon shows properly
  if (process.platform === 'darwin' && app.dock) {
    void app.dock.show();
  }

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

  // Only set menu if window is still valid
  if (mainWindow && !mainWindow.isDestroyed()) {
    Menu.setApplicationMenu(menu);

    log.info('🎯 About to start update check');
    const autoUpdaterService = container.resolve<AutoUpdaterService>(
      DI_TOKENS.AutoUpdaterService
    );
    autoUpdaterService.startUpdateCheck();
  }

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

    // Cleanup dictation service
    const dictationService = container.resolve<DictationService>(
      DI_TOKENS.DictationService
    );
    dictationService.cleanup();

    // Cleanup dictation status window (if it exists)
    if (process.env['NODE_ENV'] !== 'test') {
      const dictationStatusWindow = container.resolve<DictationStatusWindow>(
        DI_TOKENS.DictationStatusWindow
      );
      dictationStatusWindow.destroy();
    }

    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('App is quitting, cleaning up resources');

  // Only cleanup if container has been set up
  if (container.isRegistered(DI_TOKENS.AutoUpdaterService)) {
    // Stop periodic update checks
    const autoUpdaterService = container.resolve<AutoUpdaterService>(
      DI_TOKENS.AutoUpdaterService
    );
    autoUpdaterService.stopPeriodicUpdateCheck();
  }

  if (container.isRegistered(DI_TOKENS.DatabaseService)) {
    // Close database
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    databaseService.close();
  }
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
