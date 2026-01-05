// Redux state types extracted from store slices

import type { EntityState } from '@reduxjs/toolkit';

import type { PromptTemplate, Recording, UpdateInfo } from './common.js';

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
  isDictating: boolean;
  isTransitioning: boolean;
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
  summaryPrompt: string;
  prompts: PromptTemplate[];
  autoStart: boolean;
  userId?: string; // Unique user identifier
  // Dictation styling settings
  dictationStylingEnabled: boolean;
  dictationStylingPrompt: string;
  dictationSilenceTimeout: number;
  // Audio processing settings
  microphoneGain?: number; // Microphone volume level (0.0 to 2.0, default 1.0)
  systemAudioGain?: number; // System audio volume level (0.0 to 2.0, default 0.7)
}

export interface SettingsState extends FullSettingsState {
  loading: boolean;
  error: string | null;
  // Computed properties for safe trim operations
  hasAssemblyAIKey: boolean;
}

// UI slice state (renderer)
export type Page = 'list' | 'recording';
export type ModalType = 'settings' | 'prompt' | null;

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
