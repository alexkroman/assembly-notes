/**
 * IPC Handlers
 *
 * Registers all IPC handlers for communication between main and renderer processes.
 * Uses typed registry helpers for compile-time type safety.
 */

import type { Store } from '@reduxjs/toolkit';
import { BrowserWindow, shell } from 'electron';

import type { AutoUpdaterService } from './auto-updater.js';
import { DI_TOKENS, container } from './container.js';
import type { DatabaseService } from './database.js';
import { registerHandler, registerEvent } from './ipc-registry.js';
import type { RecordingDataService } from './services/recordingDataService.js';
import type { RecordingManager } from './services/recordingManager.js';
import type { SettingsService } from './services/settingsService.js';
import type { SlackIntegrationService } from './services/slackIntegrationService.js';
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
  const stateBroadcaster = container.resolve<StateBroadcaster>(
    DI_TOKENS.StateBroadcaster
  );
  const databaseService = container.resolve<DatabaseService>(
    DI_TOKENS.DatabaseService
  );
  const settingsService = container.resolve<SettingsService>(
    DI_TOKENS.SettingsService
  );
  const audioRecordingService = container.resolve<
    import('./services/audioRecordingService.js').AudioRecordingService
  >(DI_TOKENS.AudioRecordingService);

  // ==================== Events (Fire-and-Forget) ====================

  registerEvent('log', (level, ...args) => {
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

  registerEvent('microphone-audio-data', (audioData) => {
    recordingManager.sendMicrophoneAudio(audioData);
  });

  registerEvent('system-audio-data', (audioData) => {
    recordingManager.sendSystemAudio(audioData);
  });

  // ==================== Recording Control ====================

  registerHandler('start-recording', () =>
    recordingManager.startTranscription()
  );

  registerHandler('stop-recording', () => recordingManager.stopTranscription());

  registerHandler('new-recording', () => recordingDataService.newRecording());

  registerHandler('load-recording', (recordingId) =>
    recordingDataService.loadRecording(recordingId)
  );

  registerHandler('summarize-transcript', (transcript) =>
    recordingManager.summarizeTranscript(transcript)
  );

  // ==================== Recording Data ====================

  registerHandler('get-all-recordings', () =>
    databaseService.getAllRecordings()
  );

  registerHandler('search-recordings', (query) =>
    databaseService.searchRecordings(query)
  );

  registerHandler('get-recording', (id) => databaseService.getRecording(id));

  registerHandler('delete-recording', (id) => {
    databaseService.deleteRecording(id);
    return true;
  });

  registerHandler('update-recording-title', (recordingId, title) => {
    const state = store.getState();
    const currentRecording = state.recordings.currentRecording;

    if (currentRecording?.id !== recordingId) {
      logger.warn(
        `Ignoring title update: not the current recording (requested: ${recordingId}, current: ${currentRecording?.id ?? 'none'})`
      );
      return;
    }

    databaseService.updateRecording(recordingId, { title });
    store.dispatch(updateCurrentRecordingTitle(title));
    stateBroadcaster.recordingsTitle(title);
  });

  registerHandler('update-recording-summary', (recordingId, summary) => {
    const state = store.getState();
    const currentRecording = state.recordings.currentRecording;

    if (currentRecording?.id !== recordingId) {
      logger.warn(
        `Ignoring summary update: not the current recording (requested: ${recordingId}, current: ${currentRecording?.id ?? 'none'})`
      );
      return;
    }

    databaseService.updateRecording(recordingId, { summary });
    store.dispatch(updateCurrentRecordingSummary(summary));
    stateBroadcaster.recordingsSummary(summary);
  });

  registerHandler('get-audio-file-path', (recordingId) => {
    const recording = databaseService.getRecording(recordingId);
    if (recording?.audio_filename) {
      return audioRecordingService.getAudioFilePath(recording.audio_filename);
    }
    return null;
  });

  registerHandler('show-audio-in-folder', (recordingId) => {
    const recording = databaseService.getRecording(recordingId);
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
  });

  // ==================== Settings ====================

  registerHandler('get-settings', () => settingsService.getSettings());

  registerHandler('save-settings', (newSettings) => {
    const mappedSettings = { ...newSettings };
    if (newSettings.prompts) {
      mappedSettings.prompts = newSettings.prompts.map((p: PromptTemplate) => ({
        name: p.name,
        content: p.content,
      }));
    }
    settingsService.updateSettings(mappedSettings);
    return true;
  });

  registerHandler('save-prompt', (promptSettings) => {
    settingsService.updateSettings(promptSettings);
    return true;
  });

  registerHandler('save-prompts', (prompts) => {
    settingsService.updateSettings({ prompts });
    return true;
  });

  // ==================== Slack Integration ====================

  registerHandler('post-to-slack', (message, channelId) =>
    slackIntegrationService.postMessage(message, channelId)
  );

  registerHandler('slack-oauth-initiate', () =>
    slackIntegrationService.initiateOAuth()
  );

  registerHandler('slack-oauth-remove-installation', () => {
    slackIntegrationService.removeInstallation();
  });

  registerHandler('slack-oauth-get-current', () =>
    slackIntegrationService.getCurrentInstallation()
  );

  // ==================== Auto-Update ====================

  registerHandler('install-update', async () => {
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

  registerHandler('quit-and-install', () => {
    logger.info('IPC: quit-and-install requested');
    autoUpdaterService.quitAndInstall();
  });
}

export { setupIpcHandlers };
