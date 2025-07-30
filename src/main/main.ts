import * as path from 'path';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, Menu } from 'electron';
import { initMain as initAudioLoopback } from 'electron-audio-loopback';

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
  let actionCount = 0;
  store.subscribe(() => {
    const state = store.getState();
    actionCount++;
    log.info(
      `Main store state change #${String(actionCount)} - status: ${state.recording.status}, isTranscribing: ${String(state.transcription.isTranscribing)}`
    );
  });

  const originalDispatch = store.dispatch;
  store.dispatch = (action: unknown) => {
    log.info(`Main store action dispatched:`, JSON.stringify(action, null, 2));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return originalDispatch(action as any);
  };

  const autoUpdaterService = container.resolve<AutoUpdaterService>(
    DI_TOKENS.AutoUpdaterService
  );
  autoUpdaterService.init();

  const settingsService = container.resolve<SettingsService>(
    DI_TOKENS.SettingsService
  );
  settingsService.initializeSettings();
}

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
