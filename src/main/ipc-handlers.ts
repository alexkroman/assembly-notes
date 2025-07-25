import {
  ipcMain,
  BrowserWindow,
  IpcMainEvent,
  IpcMainInvokeEvent,
} from 'electron';
import { getSettings, saveSettingsToFile } from './settings.js';
import {
  startTranscription,
  stopTranscription,
  sendMicrophoneAudio,
  sendSystemAudio,
  resetAai,
} from './recordingManager.js';
import { checkForUpdatesAndNotify, quitAndInstall } from './auto-updater.js';
import log from './logger.js';

function setupIpcHandlers(mainWindow: BrowserWindow): void {
  // Handle log messages from renderer
  ipcMain.on('log', (_event: IpcMainEvent, level: string, ...args: any[]) => {
    const message = args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      )
      .join(' ');

    (log as any)[level](`[Renderer] ${message}`);
  });

  ipcMain.on(
    'microphone-audio-data',
    (_event: IpcMainEvent, audioData: ArrayBuffer) => {
      sendMicrophoneAudio(audioData);
    }
  );

  ipcMain.on(
    'system-audio-data',
    (_event: IpcMainEvent, audioData: ArrayBuffer) => {
      sendSystemAudio(audioData);
    }
  );

  ipcMain.handle('start-recording', async (): Promise<boolean> => {
    return await startTranscription(mainWindow);
  });

  ipcMain.handle('stop-recording', async (): Promise<boolean> => {
    return await stopTranscription(mainWindow);
  });

  ipcMain.handle('get-settings', (): any => {
    return getSettings();
  });

  ipcMain.handle(
    'save-settings',
    (_event: IpcMainInvokeEvent, newSettings: any): boolean => {
      saveSettingsToFile(newSettings);
      resetAai();
      return true;
    }
  );

  // Auto-updater IPC handlers
  ipcMain.handle('install-update', (): void => {
    // Download the update (it will trigger download-progress and update-downloaded events)
    const { autoUpdater } = require('electron-updater');
    autoUpdater.downloadUpdate();
  });

  ipcMain.handle('quit-and-install', (): void => {
    quitAndInstall();
  });

  ipcMain.handle('check-for-updates', (): void => {
    checkForUpdatesAndNotify();
  });
}

export { setupIpcHandlers };
