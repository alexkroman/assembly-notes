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
    console.log('🚀 AutoUpdater.init() called!');
    autoUpdater.logger = this.logger;

    const initInfo = {
      platform: process.platform,
      arch: process.arch,
      isPackaged: process.resourcesPath !== process.cwd(),
      useLocalServer: process.env['USE_LOCAL_UPDATE_SERVER'],
    };
    
    console.log('AutoUpdater initializing...', initInfo);
    this.logger.info('AutoUpdater initializing...', initInfo);

    // Configure for local testing if environment variable is set
    if (process.env['USE_LOCAL_UPDATE_SERVER'] === 'true') {
      console.log('🔧 Configuring for local update server');
      this.logger.info('Using local update server for testing');
      const feedUrl = process.env['UPDATE_FEED_URL'] ?? 'http://localhost:8000';
      
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: feedUrl,
      });

      this.logger.info('Feed URL set to:', feedUrl);

      // Force dev update config to work with unpacked app
      autoUpdater.forceDevUpdateConfig = true;

      // Disable certificate verification for local testing
      autoUpdater.requestHeaders = {
        'Cache-Control': 'no-cache',
      };

      // Allow downgrade for testing
      autoUpdater.allowDowngrade = true;

      // Auto download updates
      autoUpdater.autoDownload = true;

      // Don't check for staged rollout
      autoUpdater.disableWebInstaller = true;

      this.logger.info('AutoUpdater configured for local testing', {
        forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
        allowDowngrade: autoUpdater.allowDowngrade,
        autoDownload: autoUpdater.autoDownload,
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      this.logger.info('Checking for update...');
      this.logger.debug('AutoUpdater config:', {
        feedURL: autoUpdater.getFeedURL(),
        forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
        allowDowngrade: autoUpdater.allowDowngrade,
      });
      this.store.dispatch(startChecking());
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.logger.info('Update available:', info);
      this.store.dispatch(updateAvailable(info));
      this.mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.logger.info('Update not available:', info);
      this.store.dispatch(updateNotAvailable());
    });

    autoUpdater.on('error', (err: Error) => {
      this.logger.error('Error in auto-updater:', err);
      this.store.dispatch(setError(err.message));

      // Send error to renderer
      this.mainWindow.webContents.send('update-error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      // Dispatch startDownloading on first progress event
      const state = this.store.getState();
      if (!state.update.downloading) {
        this.logger.info('Download started');
        this.store.dispatch(startDownloading());
      }

      this.logger.debug(
        `Download progress: ${progressObj.percent.toFixed(2)}%`
      );
      this.store.dispatch(updateProgress(progressObj));
      this.mainWindow.webContents.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.logger.info('Update downloaded:', info);
      this.store.dispatch(downloadComplete(info));
      this.mainWindow.webContents.send('update-downloaded', info);

      // Notify user that update is ready
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-ready-to-install', info);
      }
    });
  }

  checkForUpdatesAndNotify(): void {
    console.log('🔍 checkForUpdatesAndNotify called');
    this.logger.debug('checkForUpdatesAndNotify called, downloadPromise is null');
    
    const state = {
      isUpdaterActive: autoUpdater.isUpdaterActive(),
      feedURL: autoUpdater.getFeedURL(),
      forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
    };
    
    console.log('Current autoUpdater state:', state);
    this.logger.debug('Current autoUpdater state:', state);
    
    console.log('🚀 Calling autoUpdater.checkForUpdatesAndNotify()...');
    void autoUpdater.checkForUpdatesAndNotify();
  }

  async checkForUpdates(): Promise<void> {
    try {
      this.logger.info('Manually checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      this.logger.info('Update check result:', result);
    } catch (error) {
      this.logger.error('Error checking for updates:', error);
      throw error;
    }
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

      this.logger.info('Quitting and installing update...');
      autoUpdater.quitAndInstall(true, true); // isSilent=true, isForceRunAfter=true
    } catch (error) {
      this.logger.error('AutoUpdaterService: Error in quitAndInstall:', error);
      throw error;
    }
  }

  startUpdateCheck(delay = 3000): void {
    console.log(`📅 Starting update check in ${delay}ms`);
    setTimeout(() => {
      console.log('⏰ Timeout expired, calling checkForUpdatesAndNotify()');
      this.checkForUpdatesAndNotify();
    }, delay);
  }

  // Get current update status
  getUpdateStatus(): unknown {
    return this.store.getState().update;
  }
}
