import type { Store } from '@reduxjs/toolkit';
import {
  BrowserWindow,
  IpcMainEvent,
  IpcMainInvokeEvent,
  ipcMain,
} from 'electron';

import type { AutoUpdaterService } from './auto-updater.js';
import { DI_TOKENS, container } from './container.js';
import type { DatabaseService } from './database.js';
import { PromptTemplate, SettingsSchema } from '../types/common.js';
import type { RecordingDataService } from './services/recordingDataService.js';
import type { RecordingManager } from './services/recordingManager.js';
import type { SettingsService } from './services/settingsService.js';
import type { SlackIntegrationService } from './services/slackIntegrationService.js';
import {
  updateCurrentRecordingTitle,
  updateCurrentRecordingSummary,
} from './store/slices/recordingsSlice.js';
import type { AppDispatch, RootState } from './store/store.js';

interface LogLevel {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

function setupIpcHandlers(
  _mainWindow: BrowserWindow,
  _store: Store<RootState> & { dispatch: AppDispatch }
): void {
  const recordingManager = container.resolve<RecordingManager>(
    DI_TOKENS.RecordingManager
  );
  const recordingDataService = container.resolve<RecordingDataService>(
    DI_TOKENS.RecordingDataService
  );
  const slackIntegrationService = container.resolve<SlackIntegrationService>(
    DI_TOKENS.SlackIntegrationService
  );
  const autoUpdaterService = container.resolve<AutoUpdaterService>(
    DI_TOKENS.AutoUpdaterService
  );
  const logger = container.resolve<typeof import('./logger.js').default>(
    DI_TOKENS.Logger
  );
  const store = container.resolve<Store<RootState> & { dispatch: AppDispatch }>(
    DI_TOKENS.Store
  );

  ipcMain.on(
    'log',
    (_event: IpcMainEvent, level: keyof LogLevel, ...args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg);
          }
          return String(arg);
        })
        .join(' ');

      (logger as LogLevel)[level](`[Renderer] ${message}`);
    }
  );

  ipcMain.on(
    'microphone-audio-data',
    (_event: IpcMainEvent, audioData: ArrayBuffer) => {
      recordingManager.sendMicrophoneAudio(audioData);
    }
  );

  ipcMain.on(
    'system-audio-data',
    (_event: IpcMainEvent, audioData: ArrayBuffer) => {
      recordingManager.sendSystemAudio(audioData);
    }
  );

  ipcMain.handle('start-recording', async (): Promise<boolean> => {
    const result = await recordingManager.startTranscription();
    return result;
  });

  ipcMain.handle('stop-recording', async (): Promise<boolean> => {
    return await recordingManager.stopTranscription();
  });

  ipcMain.handle('new-recording', async (): Promise<string | null> => {
    return await recordingDataService.newRecording();
  });

  ipcMain.handle(
    'load-recording',
    (_event: IpcMainInvokeEvent, recordingId: string): boolean => {
      return recordingDataService.loadRecording(recordingId);
    }
  );

  ipcMain.handle(
    'update-recording-title',
    (
      _event: IpcMainInvokeEvent,
      recordingId: string,
      title: string
    ): Promise<void> => {
      // Only allow updates to the current recording
      const state = store.getState();
      const currentRecording = state.recordings.currentRecording;

      if (!currentRecording || currentRecording.id !== recordingId) {
        logger.warn(
          `Ignoring title update: not the current recording (requested: ${recordingId}, current: ${currentRecording?.id ?? 'none'})`
        );
        return Promise.resolve();
      }

      const databaseService = container.resolve<DatabaseService>(
        DI_TOKENS.DatabaseService
      );
      databaseService.updateRecording(recordingId, { title });

      // Update Redux state to maintain single source of truth
      store.dispatch(updateCurrentRecordingTitle(title));
      return Promise.resolve();
    }
  );

  ipcMain.handle(
    'update-recording-summary',
    (
      _event: IpcMainInvokeEvent,
      recordingId: string,
      summary: string
    ): Promise<void> => {
      // Only allow updates to the current recording
      const state = store.getState();
      const currentRecording = state.recordings.currentRecording;

      if (!currentRecording || currentRecording.id !== recordingId) {
        logger.warn(
          `Ignoring summary update: not the current recording (requested: ${recordingId}, current: ${currentRecording?.id ?? 'none'})`
        );
        return Promise.resolve();
      }

      const databaseService = container.resolve<DatabaseService>(
        DI_TOKENS.DatabaseService
      );
      databaseService.updateRecording(recordingId, { summary });

      // Update Redux state to maintain single source of truth
      store.dispatch(updateCurrentRecordingSummary(summary));
      return Promise.resolve();
    }
  );

  ipcMain.handle(
    'summarize-transcript',
    async (
      _event: IpcMainInvokeEvent,
      transcript?: string
    ): Promise<boolean> => {
      return await recordingManager.summarizeTranscript(transcript);
    }
  );

  ipcMain.handle('get-settings', () => {
    const settingsService = container.resolve<SettingsService>(
      DI_TOKENS.SettingsService
    );
    return settingsService.getSettings();
  });

  ipcMain.handle(
    'save-settings',
    (
      _event: IpcMainInvokeEvent,
      newSettings: Partial<SettingsSchema>
    ): boolean => {
      const mappedSettings = { ...newSettings };
      if (newSettings.prompts) {
        mappedSettings.prompts = newSettings.prompts.map(
          (p: PromptTemplate) => ({
            name: p.name,
            content: p.content,
          })
        );
      }

      const settingsService = container.resolve<SettingsService>(
        DI_TOKENS.SettingsService
      );
      settingsService.updateSettings(mappedSettings);
      return true;
    }
  );

  ipcMain.handle(
    'save-prompt',
    (
      _event: IpcMainInvokeEvent,
      promptSettings: Pick<SettingsSchema, 'summaryPrompt'>
    ): boolean => {
      const settingsService = container.resolve<SettingsService>(
        DI_TOKENS.SettingsService
      );
      settingsService.updateSettings(promptSettings);
      return true;
    }
  );

  ipcMain.handle(
    'save-prompts',
    (_event: IpcMainInvokeEvent, prompts: PromptTemplate[]): boolean => {
      const settingsService = container.resolve<SettingsService>(
        DI_TOKENS.SettingsService
      );
      settingsService.updateSettings({ prompts });
      return true;
    }
  );

  ipcMain.handle(
    'post-to-slack',
    async (
      _event: IpcMainInvokeEvent,
      message: string,
      channelId?: string
    ): Promise<{ success: boolean; error?: string }> => {
      return await slackIntegrationService.postMessage(message, channelId);
    }
  );

  // Slack OAuth handlers
  ipcMain.handle(
    'slack-oauth-initiate',
    async (
      _event: IpcMainInvokeEvent,
      clientId: string,
      clientSecret: string
    ): Promise<void> => {
      await slackIntegrationService.initiateOAuth(clientId, clientSecret);
    }
  );

  ipcMain.handle(
    'slack-oauth-remove-installation',
    (_event: IpcMainInvokeEvent): void => {
      slackIntegrationService.removeInstallation();
    }
  );

  ipcMain.handle('install-update', async (): Promise<void> => {
    try {
      logger.info('IPC: install-update requested');
      const state = store.getState();

      // If already downloading or downloaded, don't start another download
      if (state.update.downloading) {
        logger.info('Update already downloading, skipping duplicate download');
        return;
      }

      if (state.update.downloaded) {
        logger.info('Update already downloaded, skipping duplicate download');
        return;
      }

      const pkg = await import('electron-updater');
      const { autoUpdater } = pkg.default;
      await autoUpdater.downloadUpdate();
    } catch (error) {
      logger.error('IPC Handler: install-update error:', error);
      throw error;
    }
  });

  ipcMain.handle('quit-and-install', (): void => {
    try {
      logger.info('IPC: quit-and-install requested');
      autoUpdaterService.quitAndInstall();
    } catch (error) {
      logger.error('IPC Handler: quit-and-install error:', error);
      throw error;
    }
  });

  ipcMain.handle('check-for-updates', async (): Promise<void> => {
    try {
      logger.info('IPC: check-for-updates requested');
      await autoUpdaterService.checkForUpdates();
    } catch (error) {
      logger.error('IPC Handler: check-for-updates error:', error);
      throw error;
    }
  });

  ipcMain.handle('get-update-status', (): unknown => {
    return autoUpdaterService.getUpdateStatus();
  });

  ipcMain.handle('get-all-recordings', () => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    return databaseService.getAllRecordings();
  });

  ipcMain.handle(
    'search-recordings',
    (_event: IpcMainInvokeEvent, query: string) => {
      const databaseService = container.resolve<DatabaseService>(
        DI_TOKENS.DatabaseService
      );
      return databaseService.searchRecordings(query);
    }
  );

  ipcMain.handle('get-recording', (_event: IpcMainInvokeEvent, id: string) => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    return databaseService.getRecording(id);
  });

  ipcMain.handle(
    'delete-recording',
    (_event: IpcMainInvokeEvent, id: string) => {
      const databaseService = container.resolve<DatabaseService>(
        DI_TOKENS.DatabaseService
      );
      databaseService.deleteRecording(id);
      return true;
    }
  );

  ipcMain.handle('slack-oauth-get-current', () => {
    return slackIntegrationService.getCurrentInstallation();
  });

  ipcMain.handle('slack-oauth-validate-channels', (): void => {
    // No validation needed - we assume all channels exist
    return;
  });
}

export { setupIpcHandlers };
