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

export interface SlackInstallation {
  teamId: string;
  teamName: string;
  botToken: string;
  botUserId: string;
  scope: string;
  installedAt: number;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface SettingsSchema {
  assemblyaiKey: string;
  summaryPrompt: string;
  prompts: PromptTemplate[];
  // Slack OAuth fields
  slackInstallation: SlackInstallation | null;
  slackChannels: string; // Comma-separated favorite channel names
  autoStart: boolean;
  userId?: string; // Unique user identifier
}

export interface Recording {
  id: string;
  title?: string;
  transcript?: string;
  summary?: string;
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
