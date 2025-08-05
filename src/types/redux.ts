// Redux state types extracted from store slices

import type { EntityState } from '@reduxjs/toolkit';

import type {
  PromptTemplate,
  Recording,
  UpdateInfo,
  SlackInstallation,
} from './common.js';

// Recording slice state
export type RecordingStatus =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'error';

export interface RecordingState {
  status: RecordingStatus;
  recordingId: string | null;
  startTime: number | null;
  error: string | null;
  connectionStatus: {
    microphone: boolean;
    system: boolean;
  };
}

// Recordings slice state
export interface RecordingsState extends EntityState<Recording, string> {
  currentRecording: Recording | null;
  searchResults: Recording[];
  searchQuery: string;
  loading: {
    fetchAll: boolean;
    search: boolean;
    fetchOne: boolean;
    update: boolean;
    delete: boolean;
  };
  error: string | null;
}

// Transcription slice state
export interface TranscriptSegment {
  text: string;
  timestamp: number;
  isFinal: boolean;
  source: 'microphone' | 'system';
}

export interface TranscriptionState {
  currentTranscript: string;
  segments: TranscriptSegment[];
  isTranscribing: boolean;
  isActive: boolean;
  microphoneTranscriptBuffer: string;
  systemAudioTranscriptBuffer: string;
  error: string | null;
}

// Update slice state
export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  progress: number;
  downloaded: boolean;
  error: string | null;
  updateInfo: UpdateInfo | null;
}

// Settings slice state
export interface FullSettingsState {
  assemblyaiKey: string;
  // Slack OAuth fields
  slackInstallation: SlackInstallation | null;
  slackChannels: string; // Comma-separated favorite channel names
  summaryPrompt: string;
  prompts: PromptTemplate[];
  autoStart: boolean;
  userId?: string; // Unique user identifier
}

export interface SettingsState extends FullSettingsState {
  loading: boolean;
  error: string | null;
  // Computed properties for safe trim operations
  hasAssemblyAIKey: boolean;
  hasSlackConfigured: boolean;
}

// UI slice state (renderer)
export type Page = 'list' | 'recording';
export type ModalType = 'settings' | 'prompt' | 'channel' | null;

export interface UIState {
  currentPage: Page;
  currentRecordingId: string | null;
  isNewRecording: boolean;
  activeModal: ModalType;
  status: string;
}

// Main process state structure (renderer store)
export interface MainProcessState {
  recording: RecordingState;
  recordings: RecordingsState;
  transcription: TranscriptionState;
  settings: SettingsState;
  update: UpdateState;
}
