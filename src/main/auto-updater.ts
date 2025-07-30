import type { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import pkg from 'electron-updater';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from './di-tokens.js';
import {
  startChecking,
  updateAvailable,
  updateNotAvailable,
  startDownloading,
  updateProgress,
  downloadComplete,
  setError,
} from './store/slices/updateSlice.js';
import type { RootState } from './store/store.js';

const { autoUpdater } = pkg;

@injectable()
export class AutoUpdaterService {
  constructor(
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow,
    @inject(DI_TOKENS.Store) private store: Store<RootState>,
    @inject(DI_TOKENS.Logger)
    private logger: typeof import('./logger.js').default
  ) {}

  init(): void {
    autoUpdater.logger = this.logger;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      this.store.dispatch(startChecking());
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.store.dispatch(updateAvailable(info));
      this.mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (_info: UpdateInfo) => {
      this.store.dispatch(updateNotAvailable());
    });

    autoUpdater.on('error', (err: Error) => {
      this.logger.error('Error in auto-updater:', err);
      this.store.dispatch(setError(err.message));
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      // Dispatch startDownloading on first progress event
      const state = this.store.getState();
      if (!state.update.downloading) {
        this.store.dispatch(startDownloading());
      }

      this.store.dispatch(updateProgress(progressObj));
      this.mainWindow.webContents.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.store.dispatch(downloadComplete(info));
      this.mainWindow.webContents.send('update-downloaded', info);
    });
  }

  checkForUpdatesAndNotify(): void {
    void autoUpdater.checkForUpdatesAndNotify();
  }

  quitAndInstall(): void {
    try {
      // Check if update is downloaded
      const state = this.store.getState();
      if (!state.update.downloaded) {
        this.logger.warn(
          'AutoUpdaterService: No update downloaded, cannot quit and install'
        );
        return;
      }

      autoUpdater.quitAndInstall(true, true); // isSilent=true, isForceRunAfter=true
    } catch (error) {
      this.logger.error('AutoUpdaterService: Error in quitAndInstall:', error);
      throw error;
    }
  }

  startUpdateCheck(delay = 3000): void {
    setTimeout(() => {
      this.checkForUpdatesAndNotify();
    }, delay);
  }
}
