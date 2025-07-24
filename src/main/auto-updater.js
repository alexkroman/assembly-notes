const { autoUpdater } = require('electron-updater');
const log = require('./logger.js');

let mainWindow = null;

/**
 * Initialize the auto-updater with the main window reference
 * @param {BrowserWindow} window - The main application window
 */
function initAutoUpdater(window) {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.logger = log;

  // Set up event handlers
  setupEventHandlers();
}

/**
 * Set up auto-updater event handlers
 */
function setupEventHandlers() {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available.', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
    log_message = `${log_message} - Downloaded ${progressObj.percent}%`;
    log_message = `${log_message} (${progressObj.transferred}/${progressObj.total})`;
    log.info(log_message);

    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
}

/**
 * Check for updates and notify user if available
 */
function checkForUpdatesAndNotify() {
  autoUpdater.checkForUpdatesAndNotify();
}

/**
 * Quit the app and install the update
 */
function quitAndInstall() {
  autoUpdater.quitAndInstall();
}

/**
 * Start checking for updates after app is ready
 * @param {number} delay - Delay in milliseconds before checking (default: 3000)
 */
function startUpdateCheck(delay = 3000) {
  setTimeout(() => {
    checkForUpdatesAndNotify();
  }, delay);
}

module.exports = {
  initAutoUpdater,
  checkForUpdatesAndNotify,
  quitAndInstall,
  startUpdateCheck,
};
