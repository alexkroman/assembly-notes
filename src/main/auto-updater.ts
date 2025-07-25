import { BrowserWindow } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

import log from './logger.js';

let mainWindow: BrowserWindow | null = null;

/**
 * Initialize the auto-updater with the main window reference
 */
function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.logger = log;

  // Set up event handlers
  setupEventHandlers();
}

/**
 * Set up auto-updater event handlers
 */
function setupEventHandlers(): void {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info: any) => {
    log.info('Update available.', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info: any) => {
    log.info('Update not available.', info);
  });

  autoUpdater.on('error', (err: Error) => {
    log.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
    log_message = `${log_message} - Downloaded ${progressObj.percent}%`;
    log_message = `${log_message} (${progressObj.transferred}/${progressObj.total})`;
    log.info(log_message);

    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    log.info('Update downloaded', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
}

/**
 * Check for updates and notify user if available
 */
function checkForUpdatesAndNotify(): void {
  autoUpdater.checkForUpdatesAndNotify();
}

/**
 * Quit the app and install the update
 */
function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

/**
 * Start checking for updates after app is ready
 */
function startUpdateCheck(delay = 3000): void {
  setTimeout(() => {
    checkForUpdatesAndNotify();
  }, delay);
}

export {
  initAutoUpdater,
  checkForUpdatesAndNotify,
  quitAndInstall,
  startUpdateCheck,
};
