// Shared types for the main process

export interface PromptTemplate {
  name: string;
  content: string;
}

export interface TranscriptionData {
  text: string;
  partial: boolean;
  streamType: 'microphone' | 'system';
}

export interface SettingsSchema {
  assemblyaiKey: string;
  summaryPrompt: string;
  prompts: PromptTemplate[];
  autoStart: boolean;
  userId?: string; // Unique user identifier
  // Dictation styling settings
  dictationStylingPrompt: string;
  // Audio processing settings
  microphoneGain?: number; // Microphone volume level (0.0 to 2.0, default 1.0)
  systemAudioGain?: number; // System audio volume level (0.0 to 2.0, default 0.7)
}

export interface Recording {
  id: string;
  title?: string;
  transcript?: string;
  summary?: string;
  audio_filename?: string;
  created_at: number;
  updated_at: number;
}

// Auto-updater types
export interface UpdateInfo {
  version: string;
  files: unknown[];
  path: string;
  sha512: string;
  releaseDate: string;
}

export interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

// Alias for TranscriptionData to match preload usage
export type TranscriptData = TranscriptionData;

export interface ConnectionStatusData {
  stream: 'microphone' | 'system';
  connected: boolean;
  retrying?: boolean;
  nextRetryIn?: number;
}

export interface RecordingStoppedData {
  recordingId: string;
}

// Alias for SettingsSchema to match preload usage
export type Settings = SettingsSchema;

// Alias for ProgressInfo to match preload usage
export type DownloadProgress = ProgressInfo;

// Re-export TranscriptSegment from redux types for convenience
export type { TranscriptSegment } from './redux.js';
