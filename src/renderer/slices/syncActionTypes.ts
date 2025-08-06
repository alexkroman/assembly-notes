// Type definitions for actions synchronized from main process
// These use createAction for better type safety and to avoid magic strings

import { createAction } from '@reduxjs/toolkit';

import type { UpdateInfo } from '../../types/common.js';
import type { SettingsState, TranscriptSegment } from '../../types/redux.js';

// Recording action creators
export const recordingActions = {
  startPending: createAction('recording/start/pending'),
  startFulfilled: createAction('recording/start/fulfilled'),
  startRejected: createAction<string>('recording/start/rejected'),
  stopPending: createAction('recording/stop/pending'),
  stopFulfilled: createAction('recording/stop/fulfilled'),
  setError: createAction<string>('recording/setError'),
  updateConnectionStatus: createAction<{
    stream: 'microphone' | 'system';
    connected: boolean;
  }>('recording/updateConnectionStatus'),
  setDictationMode: createAction<boolean>('recording/setDictationMode'),
  // Dictation-specific actions
  startDictationPending: createAction('recording/startDictation/pending'),
  startDictationFulfilled: createAction<{ recordingId: string }>(
    'recording/startDictation/fulfilled'
  ),
  startDictationRejected: createAction<string>(
    'recording/startDictation/rejected'
  ),
  stopDictationPending: createAction('recording/stopDictation/pending'),
  stopDictationFulfilled: createAction('recording/stopDictation/fulfilled'),
  stopDictationRejected: createAction<string>(
    'recording/stopDictation/rejected'
  ),
};

// Transcription action creators
export const transcriptionActions = {
  addTranscriptSegment: createAction<TranscriptSegment>(
    'transcription/addTranscriptSegment'
  ),
  updateTranscriptBuffer: createAction<{
    source?: 'microphone' | 'system';
    text?: string;
  }>('transcription/updateTranscriptBuffer'),
  setTranscriptionError: createAction<string>(
    'transcription/setTranscriptionError'
  ),
  loadExistingTranscript: createAction<string>(
    'transcription/loadExistingTranscript'
  ),
  clearTranscription: createAction('transcription/clearTranscription'),
};

// Recordings actions are now defined in the slice itself

// Update action creators
export const updateActions = {
  updateAvailable: createAction<UpdateInfo>('update/updateAvailable'),
  updateNotAvailable: createAction('update/updateNotAvailable'),
  updateProgress: createAction<{ percent: number }>('update/updateProgress'),
  downloadComplete: createAction<UpdateInfo>('update/downloadComplete'),
  startChecking: createAction('update/startChecking'),
  startDownloading: createAction('update/startDownloading'),
  resetUpdate: createAction('update/resetUpdate'),
  setError: createAction<string>('update/setError'),
};

// Settings action creators
export const settingsActions = {
  updateSettings: createAction<Partial<SettingsState>>(
    'settings/updateSettings'
  ),
};
