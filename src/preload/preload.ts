import { contextBridge, ipcRenderer } from 'electron';

import type {
  TranscriptData,
  ConnectionStatusData,
  RecordingStoppedData,
  Settings,
  PromptTemplate,
  UpdateInfo,
  DownloadProgress,
  SlackInstallation,
  Recording,
} from '../types/index.js';
import { IPC_STATE_CHANNELS } from '../types/ipc-events.js';

const electronAPI = {
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),

  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  newRecording: () =>
    ipcRenderer.invoke('new-recording') as Promise<string | null>,
  summarizeTranscript: (transcript?: string) =>
    ipcRenderer.invoke('summarize-transcript', transcript),
  sendMicrophoneAudio: (data: ArrayBuffer) => {
    ipcRenderer.send('microphone-audio-data', data);
  },
  sendSystemAudio: (data: ArrayBuffer) => {
    ipcRenderer.send('system-audio-data', data);
  },

  onTranscript: (callback: (data: TranscriptData) => void) =>
    ipcRenderer.on('transcript', (_event, data) => {
      callback(data as TranscriptData);
    }),
  onSummary: (callback: (data: { text: string }) => void) =>
    ipcRenderer.on('summary', (_event, data) => {
      callback(data as { text: string });
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
  postToSlack: (message: string, channelId?: string) =>
    ipcRenderer.invoke('post-to-slack', message, channelId),

  // Slack OAuth methods
  slackOAuthInitiate: () => ipcRenderer.invoke('slack-oauth-initiate'),
  slackOAuthRemoveInstallation: () =>
    ipcRenderer.invoke('slack-oauth-remove-installation'),
  slackOAuthGetCurrent: () => ipcRenderer.invoke('slack-oauth-get-current'),
  slackOAuthValidateChannels: (teamId: string, channelList: string) =>
    ipcRenderer.invoke('slack-oauth-validate-channels', teamId, channelList),

  installUpdate: () => ipcRenderer.invoke('install-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),

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
  getAudioFilePath: (recordingId: string) =>
    ipcRenderer.invoke('get-audio-file-path', recordingId) as Promise<
      string | null
    >,
  showAudioInFolder: (recordingId: string) =>
    ipcRenderer.invoke('show-audio-in-folder', recordingId) as Promise<boolean>,

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
  // Slack OAuth event listeners
  onSlackOAuthSuccess: (callback: (installation: SlackInstallation) => void) =>
    ipcRenderer.on('slack-oauth-success', (_event, installation) => {
      callback(installation as SlackInstallation);
    }),
  onSlackOAuthError: (callback: (error: string) => void) =>
    ipcRenderer.on('slack-oauth-error', (_event, error) => {
      callback(error as string);
    }),

  // Dictation status window
  onDictationStatusUpdate: (callback: (isDictating: boolean) => void) =>
    ipcRenderer.on('dictation-status-update', (_event, isDictating) => {
      callback(isDictating as boolean);
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

// State API for main process state synchronization (replaces electron-redux)
const stateAPI = {
  // Recording state events
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
  onRecordingTransitioning: (
    callback: (payload: { isTransitioning: boolean }) => void
  ) =>
    ipcRenderer.on(
      IPC_STATE_CHANNELS.RECORDING_TRANSITIONING,
      (_event, data) => {
        callback(data as Parameters<typeof callback>[0]);
      }
    ),
  onRecordingReset: (callback: () => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDING_RESET, () => {
      callback();
    }),

  // Transcription state events
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

  // Settings state events
  onSettingsUpdated: (callback: (payload: Record<string, unknown>) => void) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.SETTINGS_UPDATED, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),
  onSettingsSlackInstallation: (
    callback: (payload: { installation: SlackInstallation | null }) => void
  ) =>
    ipcRenderer.on(
      IPC_STATE_CHANNELS.SETTINGS_SLACK_INSTALLATION,
      (_event, data) => {
        callback(data as Parameters<typeof callback>[0]);
      }
    ),

  // Update state events
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

  // Recordings state events
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
  onRecordingsTranscript: (
    callback: (payload: { transcript: string }) => void
  ) =>
    ipcRenderer.on(IPC_STATE_CHANNELS.RECORDINGS_TRANSCRIPT, (_event, data) => {
      callback(data as Parameters<typeof callback>[0]);
    }),

  // Cleanup - remove all state listeners
  removeAllStateListeners: () => {
    Object.values(IPC_STATE_CHANNELS).forEach((channel) => {
      ipcRenderer.removeAllListeners(channel);
    });
  },
};

// Expose APIs through contextBridge
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('stateAPI', stateAPI);
contextBridge.exposeInMainWorld('logger', logger);
