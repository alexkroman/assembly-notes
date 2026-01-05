/**
 * IPC Handlers
 *
 * Registers all IPC handlers for communication between main and renderer processes.
 */

import type { Store } from '@reduxjs/toolkit';
import { BrowserWindow, ipcMain, shell } from 'electron';

import type { AutoUpdaterService } from './auto-updater.js';
import { DI_TOKENS, container } from './container.js';
import type { RecordingDataService } from './services/recordingDataService.js';
import type { RecordingManager } from './services/recordingManager.js';
import type { SettingsService } from './services/settingsService.js';
import type { TranscriptFileService } from './services/transcriptFileService.js';
import type { StateBroadcaster } from './state-broadcaster.js';
import {
  updateCurrentRecordingTitle,
  updateCurrentRecordingSummary,
} from './store/slices/recordingsSlice.js';
import type { AppDispatch, RootState } from './store/store.js';
import { PromptTemplate } from '../types/common.js';

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
  // Resolve all services once at setup time
  const recordingManager = container.resolve<RecordingManager>(
    DI_TOKENS.RecordingManager
  );
  const recordingDataService = container.resolve<RecordingDataService>(
    DI_TOKENS.RecordingDataService
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
  const stateBroadcaster = container.resolve<StateBroadcaster>(
    DI_TOKENS.StateBroadcaster
  );
  const transcriptFileService = container.resolve<TranscriptFileService>(
    DI_TOKENS.TranscriptFileService
  );
  const settingsService = container.resolve<SettingsService>(
    DI_TOKENS.SettingsService
  );
  const audioRecordingService = container.resolve<
    import('./services/audioRecordingService.js').AudioRecordingService
  >(DI_TOKENS.AudioRecordingService);

  // ==================== Events (Fire-and-Forget) ====================

  ipcMain.on('log', (_event, level: keyof LogLevel, ...args: unknown[]) => {
    const message = args
      .map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(arg);
        }
        return String(arg);
      })
      .join(' ');
    (logger as LogLevel)[level](`[Renderer] ${message}`);
  });

  ipcMain.on('microphone-audio-data', (_event, audioData: ArrayBuffer) => {
    recordingManager.sendMicrophoneAudio(audioData);
  });

  ipcMain.on('system-audio-data', (_event, audioData: ArrayBuffer) => {
    recordingManager.sendSystemAudio(audioData);
  });

  // ==================== Recording Control ====================

  ipcMain.handle('start-recording', () =>
    recordingManager.startTranscription()
  );

  ipcMain.handle('stop-recording', () => recordingManager.stopTranscription());

  ipcMain.handle('new-recording', () => recordingDataService.newRecording());

  ipcMain.handle('load-recording', (_event, recordingId: string) =>
    recordingDataService.loadRecording(recordingId)
  );

  ipcMain.handle('summarize-transcript', (_event, transcript?: string) =>
    recordingManager.summarizeTranscript(transcript)
  );

  // ==================== Recording Data ====================

  ipcMain.handle('get-all-recordings', () =>
    transcriptFileService.getAllTranscripts()
  );

  ipcMain.handle('search-recordings', (_event, query: string) =>
    transcriptFileService.searchTranscripts(query)
  );

  ipcMain.handle('get-recording', (_event, id: string) =>
    transcriptFileService.getTranscriptById(id)
  );

  ipcMain.handle('delete-recording', async (_event, id: string) => {
    await transcriptFileService.deleteTranscript(id);
    return true;
  });

  ipcMain.handle(
    'update-recording-title',
    async (_event, recordingId: string, title: string) => {
      const state = store.getState();
      const currentRecording = state.recordings.currentRecording;

      if (currentRecording?.id !== recordingId) {
        logger.warn(
          `Ignoring title update: not the current recording (requested: ${recordingId}, current: ${currentRecording?.id ?? 'none'})`
        );
        return;
      }

      await transcriptFileService.updateTranscript(recordingId, { title });
      store.dispatch(updateCurrentRecordingTitle(title));
      stateBroadcaster.recordingsTitle(title);
    }
  );

  ipcMain.handle(
    'update-recording-summary',
    async (_event, recordingId: string, summary: string) => {
      const state = store.getState();
      const currentRecording = state.recordings.currentRecording;

      if (currentRecording?.id !== recordingId) {
        logger.warn(
          `Ignoring summary update: not the current recording (requested: ${recordingId}, current: ${currentRecording?.id ?? 'none'})`
        );
        return;
      }

      await transcriptFileService.updateTranscript(recordingId, { summary });
      store.dispatch(updateCurrentRecordingSummary(summary));
      stateBroadcaster.recordingsSummary(summary);
    }
  );

  ipcMain.handle('get-audio-file-path', async (_event, recordingId: string) => {
    const recording =
      await transcriptFileService.getTranscriptById(recordingId);
    if (recording?.audio_filename) {
      return audioRecordingService.getAudioFilePath(recording.audio_filename);
    }
    return null;
  });

  ipcMain.handle(
    'show-audio-in-folder',
    async (_event, recordingId: string) => {
      const recording =
        await transcriptFileService.getTranscriptById(recordingId);
      if (recording?.audio_filename) {
        const filepath = audioRecordingService.getAudioFilePath(
          recording.audio_filename
        );
        if (filepath) {
          shell.showItemInFolder(filepath);
          return true;
        }
      }
      return false;
    }
  );

  // ==================== Settings ====================

  ipcMain.handle('get-settings', () => settingsService.getSettings());

  ipcMain.handle(
    'save-settings',
    (_event, newSettings: Record<string, unknown>) => {
      const mappedSettings = { ...newSettings };
      if (newSettings['prompts']) {
        mappedSettings['prompts'] = (
          newSettings['prompts'] as PromptTemplate[]
        ).map((p: PromptTemplate) => ({
          name: p.name,
          content: p.content,
        }));
      }
      settingsService.updateSettings(mappedSettings);
      return true;
    }
  );

  ipcMain.handle(
    'save-prompt',
    (_event, promptSettings: Record<string, unknown>) => {
      settingsService.updateSettings(promptSettings);
      return true;
    }
  );

  ipcMain.handle('save-prompts', (_event, prompts: PromptTemplate[]) => {
    settingsService.updateSettings({ prompts });
    return true;
  });

  // ==================== Auto-Update ====================

  ipcMain.handle('install-update', async () => {
    logger.info('IPC: install-update requested');
    const state = store.getState();

    if (state.update.downloading) {
      logger.info('Update already downloading, skipping duplicate download');
      return;
    }

    if (state.update.downloaded) {
      logger.info('Update already downloaded, skipping duplicate download');
      return;
    }

    await autoUpdaterService.downloadUpdate();
  });

  ipcMain.handle('quit-and-install', () => {
    logger.info('IPC: quit-and-install requested');
    autoUpdaterService.quitAndInstall();
  });
}

export { setupIpcHandlers };
