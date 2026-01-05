/**
 * Central type definitions for all IPC API methods
 * This file serves as the single source of truth for IPC communication types
 */

import type {
  Recording,
  Settings,
  PromptTemplate,
  UpdateInfo,
  DownloadProgress,
  TranscriptData,
  ConnectionStatusData,
  RecordingStoppedData,
} from './common.js';

// ============================================================================
// IPC Method Signatures
// ============================================================================

/**
 * Recording Management API
 */
export interface RecordingAPI {
  // Recording control
  'start-recording': () => Promise<boolean>;
  'stop-recording': () => Promise<boolean>;
  'new-recording': () => Promise<string | null>;
  'load-recording': (recordingId: string) => boolean;

  // Recording data management
  'update-recording-title': (
    recordingId: string,
    title: string
  ) => Promise<void>;
  'update-recording-summary': (
    recordingId: string,
    summary: string
  ) => Promise<void>;
  'summarize-transcript': (transcript?: string) => Promise<boolean>;

  // Recording queries
  'get-all-recordings': () => Recording[];
  'search-recordings': (query: string) => Recording[];
  'get-recording': (id: string) => Recording | null;
  'delete-recording': (id: string) => boolean;
}

/**
 * Audio Processing API
 */
export interface AudioAPI {
  // Audio control
  'enable-loopback-audio': () => Promise<void>;
  'disable-loopback-audio': () => Promise<void>;

  // Audio data streams (one-way, no return)
  'microphone-audio-data': (audioData: ArrayBuffer) => void;
  'system-audio-data': (audioData: ArrayBuffer) => void;
}

/**
 * Settings Management API
 */
export interface SettingsAPI {
  'get-settings': () => Settings;
  'save-settings': (settings: Partial<Settings>) => boolean;
  'save-prompt': (promptSettings: Pick<Settings, 'summaryPrompt'>) => boolean;
  'save-prompts': (prompts: PromptTemplate[]) => boolean;
}

/**
 * Auto-Update API
 */
export interface UpdateAPI {
  'install-update': () => Promise<void>;
  'quit-and-install': () => void;
}

/**
 * Logging API (one-way, no return)
 */
export interface LoggingAPI {
  log: (level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]) => void;
}

// ============================================================================
// Combined IPC API Type
// ============================================================================

/**
 * Complete IPC API interface combining all sub-APIs
 */
export type IpcAPI = RecordingAPI &
  AudioAPI &
  SettingsAPI &
  UpdateAPI &
  LoggingAPI;

// ============================================================================
// IPC Event Types
// ============================================================================

/**
 * Events sent from main to renderer
 */
export interface MainToRendererEvents {
  // Transcription events
  transcript: (data: TranscriptData) => void;
  summary: (data: { text: string }) => void;
  'summarization-started': () => void;
  'summarization-completed': () => void;

  // Connection events
  'connection-status': (data: ConnectionStatusData) => void;
  error: (message: string) => void;

  // Audio control events
  'start-audio-capture': () => void;
  'stop-audio-capture': () => void;
  'reset-audio-processing': () => void;

  // Recording events
  'new-recording-created': (recordingId: string) => void;
  'recording-stopped': (data: RecordingStoppedData) => void;

  // Update events
  'update-available': (info: UpdateInfo) => void;
  'download-progress': (progress: DownloadProgress) => void;
  'update-downloaded': (info: UpdateInfo) => void;
  'update-error': (error: string) => void;
  'update-ready-to-install': (info: UpdateInfo) => void;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if a method requires parameters
 */
export type MethodRequiresParams<T extends keyof IpcAPI> =
  Parameters<IpcAPI[T]> extends [] ? false : true;

/**
 * Extract parameter types for a given IPC method
 */
export type IpcMethodParams<T extends keyof IpcAPI> = Parameters<IpcAPI[T]>;

/**
 * Extract return type for a given IPC method
 */
export type IpcMethodReturn<T extends keyof IpcAPI> = ReturnType<IpcAPI[T]>;

/**
 * Helper type for async IPC methods
 */
export type AsyncIpcMethods = {
  [K in keyof IpcAPI]: IpcAPI[K] extends (
    ...args: unknown[]
  ) => Promise<unknown>
    ? K
    : never;
}[keyof IpcAPI];

/**
 * Helper type for sync IPC methods
 */
export type SyncIpcMethods = {
  [K in keyof IpcAPI]: IpcAPI[K] extends (
    ...args: unknown[]
  ) => Promise<unknown>
    ? never
    : K;
}[keyof IpcAPI];
