const { ipcMain } = require('electron');
const { getSettings, saveSettingsToFile } = require('./settings.js');
const { resetSlackClient } = require('./slack.js');
const {
  startTranscription,
  stopTranscription,
  sendMicrophoneAudio,
  sendSystemAudio,
  resetAai,
} = require('./transcription.js');
const {
  checkForUpdatesAndNotify,
  quitAndInstall,
} = require('./auto-updater.js');
const log = require('./logger.js');

function setupIpcHandlers(mainWindow) {
  // Handle log messages from renderer
  ipcMain.on('log', (event, level, ...args) => {
    const message = args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      )
      .join(' ');

    log[level](`[Renderer] ${message}`);
  });

  ipcMain.on('microphone-audio-data', (event, audioData) => {
    sendMicrophoneAudio(audioData);
  });

  ipcMain.on('system-audio-data', (event, audioData) => {
    sendSystemAudio(audioData);
  });

  ipcMain.handle('start-recording', async () => {
    return await startTranscription(mainWindow);
  });

  ipcMain.handle('stop-recording', async () => {
    return await stopTranscription(mainWindow);
  });

  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('save-settings', (event, newSettings) => {
    saveSettingsToFile(newSettings);
    resetSlackClient();
    resetAai();
    return true;
  });

  // Auto-updater IPC handlers
  ipcMain.handle('install-update', () => {
    quitAndInstall();
  });

  ipcMain.handle('check-for-updates', () => {
    checkForUpdatesAndNotify();
  });
}

module.exports = { setupIpcHandlers };
