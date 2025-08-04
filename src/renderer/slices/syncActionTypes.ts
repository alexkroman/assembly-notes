// Type definitions for actions synchronized from main process
// These are used to satisfy TypeScript's type checking while maintaining compatibility
// with electron-redux's string-based action synchronization

import type { PayloadAction } from '@reduxjs/toolkit';

import type { Recording, UpdateInfo } from '../../types/common.js';
import type { SettingsState, TranscriptSegment } from '../../types/redux.js';

// Helper type to create action creators that accept string types
interface StringActionCreator<T = void> {
  (payload: T): PayloadAction<T>;
  type: string;
}

// Recording action creators
export const recordingActions = {
  startRejected: {
    type: 'recording/start/rejected',
  } as StringActionCreator<string>,
  setError: { type: 'recording/setError' } as StringActionCreator<string>,
  updateConnectionStatus: {
    type: 'recording/updateConnectionStatus',
  } as StringActionCreator<{
    stream: 'microphone' | 'system';
    connected: boolean;
  }>,
};

// Transcription action creators
export const transcriptionActions = {
  addTranscriptSegment: {
    type: 'transcription/addTranscriptSegment',
  } as StringActionCreator<TranscriptSegment>,
  updateTranscriptBuffer: {
    type: 'transcription/updateTranscriptBuffer',
  } as StringActionCreator<{
    source?: 'microphone' | 'system';
    text?: string;
  }>,
  setTranscriptionError: {
    type: 'transcription/setTranscriptionError',
  } as StringActionCreator<string>,
  loadExistingTranscript: {
    type: 'transcription/loadExistingTranscript',
  } as StringActionCreator<string>,
};

// Recordings action creators
export const recordingsActions = {
  setCurrentRecording: {
    type: 'recordings/setCurrentRecording',
  } as StringActionCreator<Recording | null>,
  updateCurrentRecordingSummary: {
    type: 'recordings/updateCurrentRecordingSummary',
  } as StringActionCreator<string>,
};

// Update action creators
export const updateActions = {
  updateAvailable: {
    type: 'update/updateAvailable',
  } as StringActionCreator<UpdateInfo>,
  updateProgress: {
    type: 'update/updateProgress',
  } as StringActionCreator<{ percent: number }>,
  downloadComplete: {
    type: 'update/downloadComplete',
  } as StringActionCreator<UpdateInfo>,
  setError: { type: 'update/setError' } as StringActionCreator<string>,
};

// Settings action matcher type
export interface SettingsAction extends PayloadAction<Partial<SettingsState>> {
  type: string;
}
