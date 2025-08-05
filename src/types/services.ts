/**
 * Service interface exports
 * Re-exports all public interfaces from service files for centralized access
 */

// ============================================================================
// Transcription Service Types
// ============================================================================

export type {
  TranscriberConnection,
  TranscriptionConnection,
  TranscriptionCallbacks,
  IAssemblyAIClient,
  IAssemblyAIFactory,
} from '../main/services/transcriptionService.js';

// ============================================================================
// Summarization Service Types
// ============================================================================

export type {
  IAssemblyAILemurClient,
  IAssemblyAIClientWithLemur,
  IAssemblyAIFactoryWithLemur,
} from '../main/services/summarizationService.js';

// ============================================================================
// Slack Integration Service Types
// ============================================================================

export type { IHttpClient } from '../main/services/slackIntegrationService.js';

// ============================================================================
// Service Class Types
// ============================================================================

// Re-export the service classes themselves as types
export type { TranscriptionService } from '../main/services/transcriptionService.js';
export type { SummarizationService } from '../main/services/summarizationService.js';
export type { SlackIntegrationService } from '../main/services/slackIntegrationService.js';
export type { SettingsService } from '../main/services/settingsService.js';
export type { RecordingManager } from '../main/services/recordingManager.js';
export type { RecordingDataService } from '../main/services/recordingDataService.js';

// ============================================================================
// Database Service Types
// ============================================================================

export type { DatabaseService } from '../main/database.js';

// ============================================================================
// Auto-Update Service Types
// ============================================================================

export type { AutoUpdaterService } from '../main/auto-updater.js';

// ============================================================================
// Service Method Return Types
// ============================================================================

/**
 * Return type for transcription service connection creation
 */
export interface TranscriptionConnectionResult {
  microphone: import('assemblyai').RealtimeTranscriber | null;
  system: import('assemblyai').RealtimeTranscriber | null;
}

/**
 * Return type for Slack message posting
 */
export interface SlackPostResult {
  success: boolean;
  error?: string;
}

/**
 * Recording creation result
 */
export type RecordingCreationResult = string | null;

/**
 * Recording load result
 */
export type RecordingLoadResult = boolean;

/**
 * Summarization result
 */
export type SummarizationResult = string;

// ============================================================================
// Service Configuration Types
// ============================================================================

/**
 * Configuration for initializing transcription service
 */
export interface TranscriptionConfig {
  apiKey: string;
  sampleRate?: number;
}

/**
 * Configuration for Slack OAuth
 */
export interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Configuration for summarization
 */
export interface SummarizationConfig {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
}
