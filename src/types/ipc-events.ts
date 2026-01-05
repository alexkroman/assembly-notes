/**
 * IPC Event Types for State Synchronization
 *
 * These types define the contract between main process state changes
 * and renderer process updates. Main process broadcasts these events
 * via webContents.send(), renderer listens and dispatches to Redux.
 */

import type { Recording, UpdateInfo, SlackInstallation } from './common.js';
import type {
  RecordingStatus,
  TranscriptSegment,
  SettingsState,
} from './redux.js';

// IPC channel names for state synchronization
export const IPC_STATE_CHANNELS = {
  // Recording state
  RECORDING_STATUS: 'state:recording:status',
  RECORDING_CONNECTION: 'state:recording:connection',
  RECORDING_ERROR: 'state:recording:error',
  RECORDING_DICTATION: 'state:recording:dictation',
  RECORDING_TRANSITIONING: 'state:recording:transitioning',
  RECORDING_RESET: 'state:recording:reset',

  // Transcription state
  TRANSCRIPTION_SEGMENT: 'state:transcription:segment',
  TRANSCRIPTION_BUFFER: 'state:transcription:buffer',
  TRANSCRIPTION_ERROR: 'state:transcription:error',
  TRANSCRIPTION_CLEAR: 'state:transcription:clear',
  TRANSCRIPTION_LOAD: 'state:transcription:load',

  // Settings state
  SETTINGS_UPDATED: 'state:settings:updated',
  SETTINGS_SLACK_INSTALLATION: 'state:settings:slack-installation',

  // Update state
  UPDATE_CHECKING: 'state:update:checking',
  UPDATE_AVAILABLE: 'state:update:available',
  UPDATE_NOT_AVAILABLE: 'state:update:not-available',
  UPDATE_DOWNLOADING: 'state:update:downloading',
  UPDATE_PROGRESS: 'state:update:progress',
  UPDATE_DOWNLOADED: 'state:update:downloaded',
  UPDATE_ERROR: 'state:update:error',
  UPDATE_RESET: 'state:update:reset',

  // Recordings state
  RECORDINGS_CURRENT: 'state:recordings:current',
  RECORDINGS_TITLE: 'state:recordings:title',
  RECORDINGS_SUMMARY: 'state:recordings:summary',
  RECORDINGS_TRANSCRIPT: 'state:recordings:transcript',
} as const;

export type IPCStateChannel =
  (typeof IPC_STATE_CHANNELS)[keyof typeof IPC_STATE_CHANNELS];

// Payload types for each event
export interface IPCStatePayloads {
  // Recording payloads
  [IPC_STATE_CHANNELS.RECORDING_STATUS]: {
    status: RecordingStatus;
    recordingId?: string | null;
    startTime?: number | null;
    error?: string | null;
  };
  [IPC_STATE_CHANNELS.RECORDING_CONNECTION]: {
    stream: 'microphone' | 'system';
    connected: boolean;
  };
  [IPC_STATE_CHANNELS.RECORDING_ERROR]: {
    error: string;
  };
  [IPC_STATE_CHANNELS.RECORDING_DICTATION]: {
    isDictating: boolean;
  };
  [IPC_STATE_CHANNELS.RECORDING_TRANSITIONING]: {
    isTransitioning: boolean;
  };
  [IPC_STATE_CHANNELS.RECORDING_RESET]: Record<string, never>;

  // Transcription payloads
  [IPC_STATE_CHANNELS.TRANSCRIPTION_SEGMENT]: TranscriptSegment;
  [IPC_STATE_CHANNELS.TRANSCRIPTION_BUFFER]: {
    source: 'microphone' | 'system';
    text: string;
  };
  [IPC_STATE_CHANNELS.TRANSCRIPTION_ERROR]: {
    error: string;
  };
  [IPC_STATE_CHANNELS.TRANSCRIPTION_CLEAR]: Record<string, never>;
  [IPC_STATE_CHANNELS.TRANSCRIPTION_LOAD]: {
    transcript: string;
  };

  // Settings payloads
  [IPC_STATE_CHANNELS.SETTINGS_UPDATED]: Partial<SettingsState>;
  [IPC_STATE_CHANNELS.SETTINGS_SLACK_INSTALLATION]: {
    installation: SlackInstallation | null;
  };

  // Update payloads
  [IPC_STATE_CHANNELS.UPDATE_CHECKING]: Record<string, never>;
  [IPC_STATE_CHANNELS.UPDATE_AVAILABLE]: {
    updateInfo: UpdateInfo;
  };
  [IPC_STATE_CHANNELS.UPDATE_NOT_AVAILABLE]: Record<string, never>;
  [IPC_STATE_CHANNELS.UPDATE_DOWNLOADING]: Record<string, never>;
  [IPC_STATE_CHANNELS.UPDATE_PROGRESS]: {
    percent: number;
  };
  [IPC_STATE_CHANNELS.UPDATE_DOWNLOADED]: {
    updateInfo: UpdateInfo;
  };
  [IPC_STATE_CHANNELS.UPDATE_ERROR]: {
    error: string;
  };
  [IPC_STATE_CHANNELS.UPDATE_RESET]: Record<string, never>;

  // Recordings payloads
  [IPC_STATE_CHANNELS.RECORDINGS_CURRENT]: {
    recording: Recording | null;
  };
  [IPC_STATE_CHANNELS.RECORDINGS_TITLE]: {
    title: string;
  };
  [IPC_STATE_CHANNELS.RECORDINGS_SUMMARY]: {
    summary: string;
  };
  [IPC_STATE_CHANNELS.RECORDINGS_TRANSCRIPT]: {
    transcript: string;
  };
}

// Type helper to get payload type for a channel
export type IPCPayloadFor<T extends IPCStateChannel> =
  T extends keyof IPCStatePayloads ? IPCStatePayloads[T] : never;

// State API type for preload script exposure
export interface StateAPI {
  // Recording events
  onRecordingStatus: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDING_STATUS]
    ) => void
  ) => void;
  onRecordingConnection: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDING_CONNECTION]
    ) => void
  ) => void;
  onRecordingError: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDING_ERROR]
    ) => void
  ) => void;
  onRecordingDictation: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDING_DICTATION]
    ) => void
  ) => void;
  onRecordingTransitioning: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDING_TRANSITIONING]
    ) => void
  ) => void;
  onRecordingReset: (callback: () => void) => void;

  // Transcription events
  onTranscriptionSegment: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.TRANSCRIPTION_SEGMENT]
    ) => void
  ) => void;
  onTranscriptionBuffer: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.TRANSCRIPTION_BUFFER]
    ) => void
  ) => void;
  onTranscriptionError: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.TRANSCRIPTION_ERROR]
    ) => void
  ) => void;
  onTranscriptionClear: (callback: () => void) => void;
  onTranscriptionLoad: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.TRANSCRIPTION_LOAD]
    ) => void
  ) => void;

  // Settings events
  onSettingsUpdated: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.SETTINGS_UPDATED]
    ) => void
  ) => void;
  onSettingsSlackInstallation: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.SETTINGS_SLACK_INSTALLATION]
    ) => void
  ) => void;

  // Update events
  onUpdateChecking: (callback: () => void) => void;
  onUpdateAvailable: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.UPDATE_AVAILABLE]
    ) => void
  ) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
  onUpdateDownloading: (callback: () => void) => void;
  onUpdateProgress: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.UPDATE_PROGRESS]
    ) => void
  ) => void;
  onUpdateDownloaded: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.UPDATE_DOWNLOADED]
    ) => void
  ) => void;
  onUpdateError: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.UPDATE_ERROR]
    ) => void
  ) => void;
  onUpdateReset: (callback: () => void) => void;

  // Recordings events
  onRecordingsCurrent: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDINGS_CURRENT]
    ) => void
  ) => void;
  onRecordingsTitle: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDINGS_TITLE]
    ) => void
  ) => void;
  onRecordingsSummary: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDINGS_SUMMARY]
    ) => void
  ) => void;
  onRecordingsTranscript: (
    callback: (
      payload: IPCStatePayloads[typeof IPC_STATE_CHANNELS.RECORDINGS_TRANSCRIPT]
    ) => void
  ) => void;

  // Cleanup
  removeAllStateListeners: () => void;
}
