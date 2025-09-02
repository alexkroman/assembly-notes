import * as path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { app, BrowserWindow, Menu } from 'electron';
import { initMain as initAudioLoopback } from 'electron-audio-loopback';

// Load environment variables from .env file
dotenv.config();

// Set different app name for development builds - MUST be done early!
if (!app.isPackaged) {
  app.setName('Assembly-Notes-Dev');
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
import type { PostHogService } from './services/posthogService.js';
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

  // Initialize PostHog for error tracking (constructor handles initialization)
  container.resolve<PostHogService>(DI_TOKENS.PostHogService);

  // Set Content Security Policy based on environment
  const isDevelopment = process.env['NODE_ENV'] !== 'production';
  const isDevMode = !app.isPackaged || process.env['DEV_MODE'] === 'true';

  if (!isDevelopment && !isDevMode) {
    // Production CSP - more restrictive but allow PostHog
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self'; script-src 'self' https://*.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.assemblyai.com wss://api.assemblyai.com https://*.posthog.com https://us.i.posthog.com",
            ],
          },
        });
      }
    );
  } else {
    // Development CSP - allow Vite dev server and PostHog
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src 'self' http://localhost:5173 ws://localhost:5173; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 https://*.posthog.com https://us-assets.i.posthog.com; style-src 'self' 'unsafe-inline' http://localhost:5173; img-src 'self' data: http://localhost:5173; font-src 'self' http://localhost:5173; connect-src 'self' http://localhost:5173 ws://localhost:5173 https://api.assemblyai.com wss://api.assemblyai.com https://*.posthog.com https://us.i.posthog.com",
            ],
          },
        });
      }
    );
  }

  // Now load the renderer - IPC handlers are ready
  // Check if Vite dev server is explicitly requested (for npm run dev)
  const useViteDevServer = process.env['VITE_DEV_SERVER'] === 'true';

  if (useViteDevServer) {
    // Load from Vite dev server (npm run dev)
    void mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development (but not in tests)
    if (process.env['NODE_ENV'] !== 'test') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // Load the built file (npm start or production)
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    // Open DevTools in development mode (but not in tests)
    if (isDevMode && process.env['NODE_ENV'] !== 'test') {
      mainWindow.webContents.openDevTools();
    }
  }

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

void app.whenReady().then(async () => {
  log.info('App is ready, initializing...');

  // Install React DevTools in development (but not in tests)
  if (
    (!app.isPackaged || process.env['DEV_MODE'] === 'true') &&
    process.env['NODE_ENV'] !== 'test'
  ) {
    // Disable security warnings in development
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

    try {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import(
        'electron-devtools-installer'
      );
      await installExtension(REACT_DEVELOPER_TOOLS);
      log.info('React DevTools installed successfully');
    } catch (e) {
      log.error('Failed to install React DevTools:', e);
    }
  }

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

  if (
    container.isRegistered(DI_TOKENS.PostHogService) &&
    process.env['NODE_ENV'] !== 'test'
  ) {
    // Shutdown PostHog synchronously - it will flush events in background
    const posthogService = container.resolve<PostHogService>(
      DI_TOKENS.PostHogService
    );
    posthogService.shutdown();
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
