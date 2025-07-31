import { contextBridge, ipcRenderer } from 'electron';
import { preload as electronReduxPreload } from 'electron-redux/es/preload.js';

import { IPC_CHANNELS } from '../constants/ipc.js';
import type {
  TranscriptData,
  ConnectionStatusData,
  RecordingStoppedData,
  Settings,
  PromptTemplate,
  UpdateInfo,
  DownloadProgress,
} from '../types/index.js';

const electronAPI = {
  enableLoopbackAudio: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ENABLE_LOOPBACK_AUDIO),
  disableLoopbackAudio: () =>
    ipcRenderer.invoke(IPC_CHANNELS.DISABLE_LOOPBACK_AUDIO),

  startRecording: () => ipcRenderer.invoke(IPC_CHANNELS.START_RECORDING),
  stopRecording: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_RECORDING),
  newRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.NEW_RECORDING) as Promise<string | null>,
  summarizeTranscript: (recordingId?: string, transcript?: string) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.SUMMARIZE_TRANSCRIPT,
      recordingId,
      transcript
    ),
  sendMicrophoneAudio: (data: ArrayBuffer) => {
    ipcRenderer.send(IPC_CHANNELS.MICROPHONE_AUDIO_DATA, data);
  },
  sendSystemAudio: (data: ArrayBuffer) => {
    ipcRenderer.send(IPC_CHANNELS.SYSTEM_AUDIO_DATA, data);
  },

  onTranscript: (callback: (data: TranscriptData) => void) =>
    ipcRenderer.on('transcript', (_event, data) => {
      callback(data as TranscriptData);
    }),
  onSummary: (
    callback: (data: { text: string; recordingId?: string }) => void
  ) =>
    ipcRenderer.on('summary', (_event, data) => {
      callback(data as { text: string; recordingId?: string });
    }),
  onSummarizationStarted: (callback: () => void) =>
    ipcRenderer.on('summarization-started', () => {
      callback();
    }),
  onSummarizationCompleted: (callback: () => void) =>
    ipcRenderer.on('summarization-completed', () => {
      callback();
    }),
  onConnectionStatus: (callback: (data: ConnectionStatusData) => void) =>
    ipcRenderer.on('connection-status', (_event, data) => {
      callback(data as ConnectionStatusData);
    }),
  onError: (callback: (message: string) => void) =>
    ipcRenderer.on('error', (_event, message) => {
      callback(message as string);
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
  onNewRecordingCreated: (callback: (recordingId: string) => void) =>
    ipcRenderer.on('new-recording-created', (_event, recordingId) => {
      callback(recordingId as string);
    }),
  onRecordingStopped: (callback: (data: RecordingStoppedData) => void) =>
    ipcRenderer.on('recording-stopped', (_event, data) => {
      callback(data as RecordingStoppedData);
    }),

  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Partial<Settings>) =>
    ipcRenderer.invoke('save-settings', settings),
  savePrompt: (promptSettings: { summaryPrompt: string }) =>
    ipcRenderer.invoke('save-prompt', promptSettings),
  savePrompts: (prompts: PromptTemplate[]) =>
    ipcRenderer.invoke('save-prompts', prompts),
  selectPrompt: (index: number) => ipcRenderer.invoke('select-prompt', index),
  postToSlack: (message: string, channel: string) =>
    ipcRenderer.invoke('post-to-slack', message, channel),
  saveSelectedChannel: (channel: string) =>
    ipcRenderer.invoke('save-selected-channel', channel),

  installUpdate: () => ipcRenderer.invoke('install-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  getAllRecordings: () => ipcRenderer.invoke('get-all-recordings'),
  searchRecordings: (query: string) =>
    ipcRenderer.invoke('search-recordings', query),
  getRecording: (id: string) => ipcRenderer.invoke('get-recording', id),
  loadRecording: (id: string) => ipcRenderer.invoke('load-recording', id),
  deleteRecording: (id: string) => ipcRenderer.invoke('delete-recording', id),
  updateRecordingTitle: (id: string, title: string) =>
    ipcRenderer.invoke('update-recording-title', id, title),
  updateRecordingSummary: (id: string, summary: string) =>
    ipcRenderer.invoke('update-recording-summary', id, summary),

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
};

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

// Initialize electron-redux bridge
electronReduxPreload();

// Expose APIs through contextBridge
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('logger', logger);
