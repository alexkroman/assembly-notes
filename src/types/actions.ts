/**
 * Discriminated union types for Redux actions
 * Provides type safety and exhaustiveness checking for action handling
 */

import type { PayloadAction } from '@reduxjs/toolkit';

import type {
  Recording,
  TranscriptSegment,
  UpdateInfo,
  PromptTemplate,
  SlackInstallation,
} from './common.js';
import type { ModalType } from './redux.js';

// ============================================================================
// Recording Actions
// ============================================================================

export type RecordingActionType =
  | 'recording/start/pending'
  | 'recording/start/fulfilled'
  | 'recording/start/rejected'
  | 'recording/stop/pending'
  | 'recording/stop/fulfilled'
  | 'recording/stop/rejected'
  | 'recording/setError'
  | 'recording/clearError'
  | 'recording/updateConnectionStatus'
  | 'recording/reset';

export type RecordingAction =
  | PayloadAction<void, 'recording/start/pending'>
  | PayloadAction<{ recordingId: string }, 'recording/start/fulfilled'>
  | PayloadAction<{ error: string }, 'recording/start/rejected'>
  | PayloadAction<void, 'recording/stop/pending'>
  | PayloadAction<void, 'recording/stop/fulfilled'>
  | PayloadAction<{ error: string }, 'recording/stop/rejected'>
  | PayloadAction<string, 'recording/setError'>
  | PayloadAction<void, 'recording/clearError'>
  | PayloadAction<
      { stream: 'microphone' | 'system'; connected: boolean },
      'recording/updateConnectionStatus'
    >
  | PayloadAction<void, 'recording/reset'>;

// ============================================================================
// Transcription Actions
// ============================================================================

export type TranscriptionActionType =
  | 'transcription/addSegment'
  | 'transcription/updateBuffer'
  | 'transcription/setActive'
  | 'transcription/setError'
  | 'transcription/clearError'
  | 'transcription/loadExisting'
  | 'transcription/clear';

export type TranscriptionAction =
  | PayloadAction<TranscriptSegment, 'transcription/addSegment'>
  | PayloadAction<
      { source: 'microphone' | 'system'; text: string },
      'transcription/updateBuffer'
    >
  | PayloadAction<boolean, 'transcription/setActive'>
  | PayloadAction<string, 'transcription/setError'>
  | PayloadAction<void, 'transcription/clearError'>
  | PayloadAction<string, 'transcription/loadExisting'>
  | PayloadAction<void, 'transcription/clear'>;

// ============================================================================
// Recordings Actions
// ============================================================================

export type RecordingsActionType =
  | 'recordings/setCurrent'
  | 'recordings/updateCurrentTitle'
  | 'recordings/updateCurrentSummary'
  | 'recordings/updateCurrentTranscript'
  | 'recordings/setSearchResults'
  | 'recordings/setSearchQuery'
  | 'recordings/setLoading'
  | 'recordings/setError'
  | 'recordings/clearError';

export type RecordingsAction =
  | PayloadAction<Recording | null, 'recordings/setCurrent'>
  | PayloadAction<string, 'recordings/updateCurrentTitle'>
  | PayloadAction<string, 'recordings/updateCurrentSummary'>
  | PayloadAction<string, 'recordings/updateCurrentTranscript'>
  | PayloadAction<Recording[], 'recordings/setSearchResults'>
  | PayloadAction<string, 'recordings/setSearchQuery'>
  | PayloadAction<
      { type: keyof RecordingsLoadingState; value: boolean },
      'recordings/setLoading'
    >
  | PayloadAction<string, 'recordings/setError'>
  | PayloadAction<void, 'recordings/clearError'>;

// Helper type for recordings loading state
export interface RecordingsLoadingState {
  fetchAll: boolean;
  search: boolean;
  fetchOne: boolean;
  update: boolean;
  delete: boolean;
}

// ============================================================================
// Settings Actions
// ============================================================================

export type SettingsActionType =
  | 'settings/update'
  | 'settings/setLoading'
  | 'settings/setError'
  | 'settings/clearError';

export interface SettingsUpdatePayload {
  assemblyaiKey?: string;
  slackInstallation?: SlackInstallation | null;
  slackChannels?: string;
  summaryPrompt?: string;
  prompts?: PromptTemplate[];
  autoStart?: boolean;
}

export type SettingsAction =
  | PayloadAction<SettingsUpdatePayload, 'settings/update'>
  | PayloadAction<boolean, 'settings/setLoading'>
  | PayloadAction<string, 'settings/setError'>
  | PayloadAction<void, 'settings/clearError'>;

// ============================================================================
// Update Actions
// ============================================================================

export type UpdateActionType =
  | 'update/checkStart'
  | 'update/checkComplete'
  | 'update/available'
  | 'update/downloadStart'
  | 'update/downloadProgress'
  | 'update/downloadComplete'
  | 'update/error'
  | 'update/clearError';

export type UpdateAction =
  | PayloadAction<void, 'update/checkStart'>
  | PayloadAction<void, 'update/checkComplete'>
  | PayloadAction<UpdateInfo, 'update/available'>
  | PayloadAction<void, 'update/downloadStart'>
  | PayloadAction<number, 'update/downloadProgress'>
  | PayloadAction<UpdateInfo, 'update/downloadComplete'>
  | PayloadAction<string, 'update/error'>
  | PayloadAction<void, 'update/clearError'>;

// ============================================================================
// UI Actions (Renderer Only)
// ============================================================================

export type UIActionType =
  | 'ui/navigateToList'
  | 'ui/navigateToRecording'
  | 'ui/setActiveModal'
  | 'ui/setStatus';

export type UIAction =
  | PayloadAction<void, 'ui/navigateToList'>
  | PayloadAction<
      { recordingId: string; isNew?: boolean },
      'ui/navigateToRecording'
    >
  | PayloadAction<ModalType, 'ui/setActiveModal'>
  | PayloadAction<string, 'ui/setStatus'>;

// ============================================================================
// Combined Action Types
// ============================================================================

/**
 * All action types in the main process
 */
export type MainProcessActionType =
  | RecordingActionType
  | TranscriptionActionType
  | RecordingsActionType
  | SettingsActionType
  | UpdateActionType;

/**
 * All actions in the main process
 */
export type MainProcessAction =
  | RecordingAction
  | TranscriptionAction
  | RecordingsAction
  | SettingsAction
  | UpdateAction;

/**
 * All action types in the renderer process
 */
export type RendererActionType = MainProcessActionType | UIActionType;

/**
 * All actions in the renderer process
 */
export type RendererAction = MainProcessAction | UIAction;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an action is a recording action
 */
export function isRecordingAction(action: {
  type: string;
}): action is RecordingAction {
  return action.type.startsWith('recording/');
}

/**
 * Type guard to check if an action is a transcription action
 */
export function isTranscriptionAction(action: {
  type: string;
}): action is TranscriptionAction {
  return action.type.startsWith('transcription/');
}

/**
 * Type guard to check if an action is a recordings action
 */
export function isRecordingsAction(action: {
  type: string;
}): action is RecordingsAction {
  return action.type.startsWith('recordings/');
}

/**
 * Type guard to check if an action is a settings action
 */
export function isSettingsAction(action: {
  type: string;
}): action is SettingsAction {
  return action.type.startsWith('settings/');
}

/**
 * Type guard to check if an action is an update action
 */
export function isUpdateAction(action: {
  type: string;
}): action is UpdateAction {
  return action.type.startsWith('update/');
}

/**
 * Type guard to check if an action is a UI action
 */
export function isUIAction(action: { type: string }): action is UIAction {
  return action.type.startsWith('ui/');
}
