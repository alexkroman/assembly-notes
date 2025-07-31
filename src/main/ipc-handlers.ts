import type { Store } from '@reduxjs/toolkit';
import {
  BrowserWindow,
  IpcMainEvent,
  IpcMainInvokeEvent,
  ipcMain,
} from 'electron';
import { IPC_CHANNELS } from '../constants/ipc.js';

import type { AutoUpdaterService } from './auto-updater.js';
import { DI_TOKENS, container } from './container.js';
import { PromptTemplate, SettingsSchema } from '../types/common.js';
import type { RecordingManager } from './services/recordingManager.js';
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
  saveSelectedChannel,
  saveSettings,
  selectPrompt,
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
    IPC_CHANNELS.SYSTEM_AUDIO_DATA,
    (_event: IpcMainEvent, audioData: ArrayBuffer) => {
      recordingManager.sendSystemAudio(audioData);
    }
  );

  ipcMain.handle(IPC_CHANNELS.START_RECORDING, async (): Promise<boolean> => {
    const result = await recordingManager.startTranscription();
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.STOP_RECORDING, async (): Promise<boolean> => {
    return await recordingManager.stopTranscription();
  });

  ipcMain.handle(IPC_CHANNELS.NEW_RECORDING, async (): Promise<string | null> => {
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

      // Clear any existing transcription errors
      const { clearTranscription } = await import(
        './store/slices/transcriptionSlice.js'
      );
      store.dispatch(clearTranscription());

      // Stop any active recording and reset connections
      await recordingManager.stopTranscription();
      _mainWindow.webContents.send('reset-audio-processing');
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
    'select-prompt',
    async (_event: IpcMainInvokeEvent, index: number): Promise<boolean> => {
      await store.dispatch(selectPrompt(index)).unwrap();
      return true;
    }
  );

  ipcMain.handle(
    'save-selected-channel',
    async (_event: IpcMainInvokeEvent, channel: string): Promise<boolean> => {
      await store.dispatch(saveSelectedChannel(channel)).unwrap();
      return true;
    }
  );

  ipcMain.handle(
    'post-to-slack',
    async (
      _event: IpcMainInvokeEvent,
      message: string,
      channel: string
    ): Promise<{ success: boolean; error?: string }> => {
      return await slackService.postMessage(message, channel);
    }
  );

  ipcMain.handle('install-update', (): void => {
    void import('electron-updater').then(({ autoUpdater }) => {
      void autoUpdater.downloadUpdate();
    });
  });

  ipcMain.handle('quit-and-install', (): void => {
    try {
      autoUpdaterService.quitAndInstall();
    } catch (error) {
      logger.error('IPC Handler: quit-and-install error:', error);
      throw error;
    }
  });

  ipcMain.handle('check-for-updates', (): void => {
    autoUpdaterService.checkForUpdatesAndNotify();
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
}

export { setupIpcHandlers };
