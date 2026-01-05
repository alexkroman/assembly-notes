/**
 * Preload Script
 *
 * Exposes typed IPC APIs to the renderer process via contextBridge.
 * Uses typed helpers for compile-time type safety.
 */

import { contextBridge, ipcRenderer } from 'electron';

import { createInvoker, createSender } from './typed-ipc.js';
import type {
  UpdateInfo,
  DownloadProgress,
  SlackInstallation,
  Recording,
} from '../types/index.js';
import { IPC_STATE_CHANNELS } from '../types/ipc-events.js';

// ============================================================================
// Electron API (Request/Response + Events)
// ============================================================================

const electronAPI = {
  // Audio Loopback (handled by electron-audio-loopback library)
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),

  // Recording Control
  startRecording: createInvoker('start-recording'),
  stopRecording: createInvoker('stop-recording'),
  newRecording: createInvoker('new-recording'),
  loadRecording: createInvoker('load-recording'),
  summarizeTranscript: createInvoker('summarize-transcript'),

  // Recording Data
  getAllRecordings: createInvoker('get-all-recordings'),
  searchRecordings: createInvoker('search-recordings'),
  getRecording: createInvoker('get-recording'),
  deleteRecording: createInvoker('delete-recording'),
  updateRecordingTitle: createInvoker('update-recording-title'),
  updateRecordingSummary: createInvoker('update-recording-summary'),
  getAudioFilePath: createInvoker('get-audio-file-path'),
  showAudioInFolder: createInvoker('show-audio-in-folder'),

  // Settings
  getSettings: createInvoker('get-settings'),
  saveSettings: createInvoker('save-settings'),
  savePrompt: createInvoker('save-prompt'),
  savePrompts: createInvoker('save-prompts'),

  // Slack Integration
  postToSlack: createInvoker('post-to-slack'),
  slackOAuthInitiate: createInvoker('slack-oauth-initiate'),
  slackOAuthRemoveInstallation: createInvoker(
    'slack-oauth-remove-installation'
  ),
  slackOAuthGetCurrent: createInvoker('slack-oauth-get-current'),

  // Auto-Update
  installUpdate: createInvoker('install-update'),
  quitAndInstall: createInvoker('quit-and-install'),

  // Audio Streaming (fire-and-forget)
  sendMicrophoneAudio: createSender('microphone-audio-data'),
  sendSystemAudio: createSender('system-audio-data'),

  // Event Listeners (main → renderer)
  onSummary: (
    callback: (data: { text: string; recordingId: string }) => void
  ) =>
    ipcRenderer.on('summary', (_event, data) => {
      callback(data as { text: string; recordingId: string });
    }),
  onSummarizationStarted: (callback: () => void) =>
    ipcRenderer.on('summarization-started', () => {
      callback();
    }),
  onSummarizationCompleted: (callback: () => void) =>
    ipcRenderer.on('summarization-completed', () => {
      callback();
    }),
  onDictationStatus: (callback: (isDictating: boolean) => void) =>
    ipcRenderer.on('dictation-status', (_event, isDictating) => {
      callback(isDictating as boolean);
    }),
  onStartAudioCapture: (callback: () => void) =>
    ipcRenderer.on('start-audio-capture', () => {
      callback();
    }),
  onStopAudioCapture: (callback: () => void) =>
    ipcRenderer.on('stop-audio-capture', () => {
      callback();
    }),
  onResetAudioProcessing: (callback: () => void) =>
    ipcRenderer.on('reset-audio-processing', () => {
      callback();
    }),

  // Update Events
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update-available', (_event, info) => {
      callback(info as UpdateInfo);
    }),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) =>
    ipcRenderer.on('download-progress', (_event, progress) => {
      callback(progress as DownloadProgress);
    }),
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update-downloaded', (_event, info) => {
      callback(info as UpdateInfo);
    }),
  onUpdateError: (callback: (error: string) => void) =>
    ipcRenderer.on('update-error', (_event, error) => {
      callback(error as string);
    }),
  onUpdateReadyToInstall: (callback: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update-ready-to-install', (_event, info) => {
      callback(info as UpdateInfo);
    }),

  // Slack OAuth Events
  onSlackOAuthSuccess: (callback: (installation: SlackInstallation) => void) =>
    ipcRenderer.on('slack-oauth-success', (_event, installation) => {
      callback(installation as SlackInstallation);
    }),
  onSlackOAuthError: (callback: (error: string) => void) =>
    ipcRenderer.on('slack-oauth-error', (_event, error) => {
      callback(error as string);
    }),

  // Dictation Status Window
  onDictationStatusUpdate: (callback: (isDictating: boolean) => void) =>
    ipcRenderer.on('dictation-status-update', (_event, isDictating) => {
      callback(isDictating as boolean);
    }),

  // Cleanup
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
};

// ============================================================================
// Logger API
// ============================================================================

const logger = {
  info: (...args: unknown[]) => {
    ipcRenderer.send('log', 'info', ...args);
  },
  warn: (...args: unknown[]) => {
    ipcRenderer.send('log', 'warn', ...args);
  },
  error: (...args: unknown[]) => {
    ipcRenderer.send('log', 'error', ...args);
  },
  debug: (...args: unknown[]) => {
    ipcRenderer.send('log', 'debug', ...args);
  },
};

// ============================================================================
// State API (Main → Renderer State Synchronization)
// ============================================================================

const stateAPI = {
  // Recording State
  onRecordingStatus: (
    callback: (payload: {
      status: string;
      recordingId?: string | null;
      startTime?: number | null;
      error?: string | null;
    }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDING_STATUS, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onRecordingConnection: (
    callback: (payload: {
      stream: 'microphone' | 'system';
      connected: boolean;
    }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDING_CONNECTION, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onRecordingError: (callback: (payload: { error: string }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDING_ERROR, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onRecordingDictation: (
    callback: (payload: { isDictating: boolean }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDING_DICTATION, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onRecordingReset: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDING_RESET, () => {
      callback();
    }),

  // Transcription State
  onTranscriptionSegment: (
    callback: (payload: {
      text: string;
      timestamp: number;
      isFinal: boolean;
      source: 'microphone' | 'system';
    }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.TRANSCRIPTION_SEGMENT, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onTranscriptionBuffer: (
    callback: (payload: {
      source: 'microphone' | 'system';
      text: string;
    }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.TRANSCRIPTION_BUFFER, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onTranscriptionError: (callback: (payload: { error: string }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.TRANSCRIPTION_ERROR, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onTranscriptionClear: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.TRANSCRIPTION_CLEAR, () => {
      callback();
    }),
  onTranscriptionLoad: (callback: (payload: { transcript: string }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.TRANSCRIPTION_LOAD, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),

  // Settings State
  onSettingsUpdated: (callback: (payload: Record<string, unknown>) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.SETTINGS_UPDATED, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),

  // Update State
  onUpdateChecking: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_CHECKING, () => {
      callback();
    }),
  onUpdateAvailable: (
    callback: (payload: { updateInfo: UpdateInfo }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_AVAILABLE, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onUpdateNotAvailable: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_NOT_AVAILABLE, () => {
      callback();
    }),
  onUpdateDownloading: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_DOWNLOADING, () => {
      callback();
    }),
  onUpdateProgress: (callback: (payload: { percent: number }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_PROGRESS, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onUpdateDownloaded: (
    callback: (payload: { updateInfo: UpdateInfo }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_DOWNLOADED, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onUpdateError: (callback: (payload: { error: string }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_ERROR, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onUpdateReset: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.UPDATE_RESET, () => {
      callback();
    }),

  // Recordings State
  onRecordingsCurrent: (
    callback: (payload: { recording: Recording | null }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDINGS_CURRENT, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onRecordingsTitle: (callback: (payload: { title: string }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDINGS_TITLE, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onRecordingsSummary: (callback: (payload: { summary: string }) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDINGS_SUMMARY, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),

  // Cleanup
  removeAllStateListeners: () => {
    Object.values(IPC_STATE_CHANNELS).forEach((channel) => {
      ipcRenderer.removeAllListeners(channel);
    });
  },
};

// ============================================================================
// Expose APIs to Renderer
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('stateAPI', stateAPI);
contextBridge.exposeInMainWorld('logger', logger);
