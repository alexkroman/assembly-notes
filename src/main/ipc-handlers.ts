import type { Store } from '@reduxjs/toolkit';
import {
  BrowserWindow,
  IpcMainEvent,
  IpcMainInvokeEvent,
  ipcMain,
} from 'electron';

import type { AutoUpdaterService } from './auto-updater.js';
import { DI_TOKENS, container } from './container.js';
import { PromptTemplate, SettingsSchema } from '../types/common.js';
import type { RecordingManager } from './services/recordingManager.js';
import type { SlackOAuthService } from './services/slackOAuthService.js';
import type { SlackService } from './services/slackService.js';
import {
  deleteRecording,
  fetchAllRecordings,
  fetchRecording,
  searchRecordings,
  updateRecordingSummary,
  updateRecordingTitle,
} from './store/slices/recordingsSlice.js';
import {
  fetchSettings,
  savePrompt,
  savePrompts,
  saveSettings,
} from './store/slices/settingsSlice.js';
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
  const slackService = container.resolve<SlackService>(DI_TOKENS.SlackService);
  const slackOAuthService = container.resolve<SlackOAuthService>(
    DI_TOKENS.SlackOAuthService
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
    return await recordingManager.newRecording();
  });

  ipcMain.handle(
    'load-recording',
    (_event: IpcMainInvokeEvent, recordingId: string): boolean => {
      return recordingManager.loadRecording(recordingId);
    }
  );

  ipcMain.handle(
    'update-recording-title',
    async (
      _event: IpcMainInvokeEvent,
      recordingId: string,
      title: string
    ): Promise<void> => {
      // Validate that this update is for the current recording
      const state = store.getState();
      const currentRecordingId = state.recordings.currentRecording?.id;

      if (currentRecordingId && recordingId !== currentRecordingId) {
        logger.warn(
          `Ignoring title update for non-current recording: ${recordingId} !== ${currentRecordingId}`
        );
        return;
      }

      await store
        .dispatch(updateRecordingTitle({ id: recordingId, title }))
        .unwrap();
    }
  );

  ipcMain.handle(
    'update-recording-summary',
    async (
      _event: IpcMainInvokeEvent,
      recordingId: string,
      summary: string
    ): Promise<void> => {
      // Validate that this update is for the current recording
      const state = store.getState();
      const currentRecordingId = state.recordings.currentRecording?.id;

      if (currentRecordingId && recordingId !== currentRecordingId) {
        logger.warn(
          `Ignoring summary update for non-current recording: ${recordingId} !== ${currentRecordingId}`
        );
        return;
      }

      await store
        .dispatch(updateRecordingSummary({ id: recordingId, summary }))
        .unwrap();
    }
  );

  ipcMain.handle(
    'summarize-transcript',
    async (
      _event: IpcMainInvokeEvent,
      recordingId?: string,
      transcript?: string
    ): Promise<boolean> => {
      return await recordingManager.summarizeTranscript(
        recordingId,
        transcript
      );
    }
  );

  ipcMain.handle('get-settings', async () => {
    return await store.dispatch(fetchSettings()).unwrap();
  });

  ipcMain.handle(
    'save-settings',
    async (
      _event: IpcMainInvokeEvent,
      newSettings: Partial<SettingsSchema>
    ): Promise<boolean> => {
      const mappedSettings = { ...newSettings };
      if (newSettings.prompts) {
        mappedSettings.prompts = newSettings.prompts.map(
          (p: PromptTemplate) => ({
            name: p.name,
            content: p.content,
          })
        );
      }

      await store.dispatch(saveSettings(mappedSettings)).unwrap();
      return true;
    }
  );

  ipcMain.handle(
    'save-prompt',
    async (
      _event: IpcMainInvokeEvent,
      promptSettings: Pick<SettingsSchema, 'summaryPrompt'>
    ): Promise<boolean> => {
      await store.dispatch(savePrompt(promptSettings)).unwrap();
      return true;
    }
  );

  ipcMain.handle(
    'save-prompts',
    async (
      _event: IpcMainInvokeEvent,
      prompts: PromptTemplate[]
    ): Promise<boolean> => {
      await store.dispatch(savePrompts(prompts)).unwrap();
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
      return await slackService.postMessage(message, channelId);
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
      const slackOAuthService = container.resolve<SlackOAuthService>(
        DI_TOKENS.SlackOAuthService
      );
      await slackOAuthService.initiateOAuth(clientId, clientSecret);
    }
  );

  ipcMain.handle(
    'slack-oauth-remove-installation',
    (_event: IpcMainInvokeEvent): void => {
      const slackOAuthService = container.resolve<SlackOAuthService>(
        DI_TOKENS.SlackOAuthService
      );
      slackOAuthService.removeInstallation();
    }
  );

  ipcMain.handle('install-update', async (): Promise<void> => {
    try {
      logger.info('IPC: install-update requested');
      await import('electron-updater').then(({ autoUpdater }) => {
        return autoUpdater.downloadUpdate();
      });
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

  ipcMain.handle('get-all-recordings', async () => {
    return await store.dispatch(fetchAllRecordings()).unwrap();
  });

  ipcMain.handle(
    'search-recordings',
    async (_event: IpcMainInvokeEvent, query: string) => {
      return await store.dispatch(searchRecordings(query)).unwrap();
    }
  );

  ipcMain.handle(
    'get-recording',
    async (_event: IpcMainInvokeEvent, id: string) => {
      return await store.dispatch(fetchRecording(id)).unwrap();
    }
  );

  ipcMain.handle(
    'delete-recording',
    async (_event: IpcMainInvokeEvent, id: string) => {
      await store.dispatch(deleteRecording(id)).unwrap();
      return true;
    }
  );

  ipcMain.handle('slack-oauth-get-current', () => {
    return slackOAuthService.getCurrentInstallation();
  });

  ipcMain.handle('slack-oauth-validate-channels', (): void => {
    // No validation needed - we assume all channels exist
    return;
  });
}

export { setupIpcHandlers };
