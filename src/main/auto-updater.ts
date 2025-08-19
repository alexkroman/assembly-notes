import type { Store } from '@reduxjs/toolkit';
import { app, BrowserWindow } from 'electron';
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
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow,
    @inject(DI_TOKENS.Store) private store: Store<RootState>,
    @inject(DI_TOKENS.Logger)
    private logger: typeof import('./logger.js').default
  ) {}

  init(): void {
    this.logger.info('🚀 AutoUpdater.init() called!');
    autoUpdater.logger = this.logger;

    const initInfo = {
      platform: process.platform,
      arch: process.arch,
      isPackaged: process.resourcesPath !== process.cwd(),
      useLocalServer: process.env['USE_LOCAL_UPDATE_SERVER'],
    };

    // Already logged on the next line
    this.logger.info('AutoUpdater initializing...', initInfo);

    // Configure for local testing if environment variable is set
    if (process.env['USE_LOCAL_UPDATE_SERVER'] === 'true') {
      this.logger.info('🔧 Configuring for local update server');
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

      // Don't auto download updates - wait for user confirmation
      autoUpdater.autoDownload = false;

      // Don't check for staged rollout
      autoUpdater.disableWebInstaller = true;

      // Ensure app restarts after update
      autoUpdater.autoInstallOnAppQuit = true;

      this.logger.info('AutoUpdater configured for local testing', {
        forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
        allowDowngrade: autoUpdater.allowDowngrade,
        autoDownload: autoUpdater.autoDownload,
      });
    } else {
      // Production configuration
      autoUpdater.autoDownload = false; // Don't auto download - wait for user confirmation
      autoUpdater.autoInstallOnAppQuit = true; // Ensure app restarts after update
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      this.logger.info('Checking for update...');
      this.logger.debug('AutoUpdater config:', {
        forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
        allowDowngrade: autoUpdater.allowDowngrade,
      });
      this.store.dispatch(startChecking());
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.logger.info('Update available:', info);
      // Serialize the date to avoid Redux warnings
      const serializedInfo = {
        ...info,
        releaseDate: info.releaseDate || '',
      };
      this.store.dispatch(updateAvailable(serializedInfo));
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-available', serializedInfo);
      }
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.logger.info('Update not available:', info);
      this.store.dispatch(updateNotAvailable());
    });

    autoUpdater.on('error', (err: Error) => {
      // Silently ignore all network-related errors - these are expected in various network conditions
      if (
        err.message.includes('ERR_INTERNET_DISCONNECTED') ||
        err.message.includes('ERR_NAME_NOT_RESOLVED') ||
        err.message.includes('ERR_NETWORK_CHANGED') ||
        err.message.includes('ERR_TIMED_OUT')
      ) {
        return;
      }

      this.logger.error('Error in auto-updater:', err);
      this.store.dispatch(setError(err.message));

      // Send error to renderer
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-error', err.message);
      }
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
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.logger.info('Update downloaded:', info);

      // Serialize the date to avoid Redux warnings
      const serializedInfo = {
        ...info,
        releaseDate: info.releaseDate || '',
      };
      this.store.dispatch(downloadComplete(serializedInfo));

      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('update-downloaded', serializedInfo);
        this.mainWindow.webContents.send('update-ready-to-install', info);
      }
    });
  }

  checkForUpdatesAndNotify(): void {
    this.logger.info('🔍 checkForUpdatesAndNotify called');
    this.logger.debug(
      'checkForUpdatesAndNotify called, downloadPromise is null'
    );

    const state = {
      isUpdaterActive: autoUpdater.isUpdaterActive(),
      forceDevUpdateConfig: autoUpdater.forceDevUpdateConfig,
    };

    // Already logged on the next line
    this.logger.debug('Current autoUpdater state:', state);

    this.logger.info(
      '🚀 Calling autoUpdater.checkForUpdates() (without native notification)...'
    );
    // Use checkForUpdates instead of checkForUpdatesAndNotify to avoid native notifications
    // The modal dialog will be shown via the update-available event handler
    void autoUpdater.checkForUpdates().catch((error: unknown) => {
      // Silently ignore missing app-update.yml - this happens in dev builds or improperly packaged apps
      if (error instanceof Error && error.message.includes('app-update.yml')) {
        return;
      }
      // Re-throw other errors to be handled by the error event
      throw error;
    });
  }

  async checkForUpdates(): Promise<void> {
    try {
      this.logger.info('Manually checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      this.logger.info('Update check result:', result);
    } catch (error: unknown) {
      // Silently ignore missing app-update.yml
      if (error instanceof Error && error.message.includes('app-update.yml')) {
        return;
      }
      this.logger.error('Error checking for updates:', error);
      throw error;
    }
  }

  startUpdateCheck(delay = 3000): void {
    this.logger.info(`📅 Starting initial update check in ${String(delay)}ms`);

    // Initial check after delay
    setTimeout(() => {
      this.logger.info(
        '⏰ Initial timeout expired, calling checkForUpdatesAndNotify()'
      );
      this.checkForUpdatesAndNotify();
    }, delay);

    // Set up hourly update checks (1 hour = 3600000 ms)
    this.startPeriodicUpdateCheck();
  }

  private startPeriodicUpdateCheck(): void {
    // Clear any existing interval
    this.stopPeriodicUpdateCheck();

    const intervalMs = 60 * 60 * 1000; // 1 hour in milliseconds
    this.logger.info(
      `⏰ Setting up hourly update checks (every ${String(intervalMs)}ms)`
    );

    this.updateCheckInterval = setInterval(() => {
      this.logger.info('🔄 Performing scheduled hourly update check');
      this.checkForUpdatesAndNotify();
    }, intervalMs);
  }

  stopPeriodicUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      this.logger.info('⏹️ Stopped periodic update checks');
    }
  }

  // Get current update status
  getUpdateStatus(): unknown {
    return this.store.getState().update;
  }

  // Download the available update
  async downloadUpdate(): Promise<void> {
    this.logger.info('Downloading update...');
    await autoUpdater.downloadUpdate();
  }

  // Quit and install the downloaded update
  quitAndInstall(): void {
    this.logger.info('Quitting and installing update...');

    // On macOS, we need to focus the app before quitting to ensure proper restart
    if (process.platform === 'darwin') {
      app.focus({ steal: true });
    }

    // Quit and install with restart
    // First param (isSilent): false - show installation progress
    // Second param (forceRunAfter): true - restart app after installation
    autoUpdater.quitAndInstall(false, true);
  }
}
