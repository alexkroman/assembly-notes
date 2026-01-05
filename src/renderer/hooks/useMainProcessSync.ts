/**
 * useMainProcessSync Hook
 *
 * Sets up IPC event listeners for state synchronization from main process.
 * Replaces electron-redux automatic synchronization with explicit IPC events.
 * This hook should be used at the app root to ensure state is synced.
 */

import { useEffect } from 'react';

import { useAppDispatch } from './redux.js';
import {
  setCurrentRecording,
  updateCurrentRecordingTitle,
  updateCurrentRecordingSummary,
} from '../slices/recordingsSlice.js';
import {
  recordingActions,
  transcriptionActions,
  settingsActions,
  updateActions,
} from '../slices/syncActionTypes.js';

export function useMainProcessSync(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // ==================== Recording State Sync ====================

    window.stateAPI.onRecordingStatus((payload) => {
      switch (payload.status) {
        case 'starting':
          dispatch(recordingActions.startPending());
          break;
        case 'recording':
          dispatch(recordingActions.startFulfilled());
          break;
        case 'stopping':
          dispatch(recordingActions.stopPending());
          break;
        case 'idle':
          dispatch(recordingActions.stopFulfilled());
          break;
        case 'error':
          if (payload.error) {
            dispatch(recordingActions.setError(payload.error));
          }
          break;
      }
    });

    window.stateAPI.onRecordingConnection((payload) => {
      dispatch(recordingActions.updateConnectionStatus(payload));
    });

    window.stateAPI.onRecordingError((payload) => {
      dispatch(recordingActions.setError(payload.error));
    });

    window.stateAPI.onRecordingDictation((payload) => {
      dispatch(recordingActions.setDictationMode(payload.isDictating));
    });

    window.stateAPI.onRecordingReset(() => {
      dispatch(recordingActions.stopFulfilled());
    });

    // ==================== Transcription State Sync ====================

    window.stateAPI.onTranscriptionSegment((payload) => {
      dispatch(transcriptionActions.addTranscriptSegment(payload));
    });

    window.stateAPI.onTranscriptionBuffer((payload) => {
      dispatch(transcriptionActions.updateTranscriptBuffer(payload));
    });

    window.stateAPI.onTranscriptionError((payload) => {
      dispatch(transcriptionActions.setTranscriptionError(payload.error));
    });

    window.stateAPI.onTranscriptionClear(() => {
      dispatch(transcriptionActions.clearTranscription());
    });

    window.stateAPI.onTranscriptionLoad((payload) => {
      dispatch(transcriptionActions.loadExistingTranscript(payload.transcript));
    });

    // ==================== Settings State Sync ====================

    window.stateAPI.onSettingsUpdated((payload) => {
      dispatch(settingsActions.updateSettings(payload));
    });

    // ==================== Update State Sync ====================

    window.stateAPI.onUpdateChecking(() => {
      dispatch(updateActions.startChecking());
    });

    window.stateAPI.onUpdateAvailable((payload) => {
      dispatch(updateActions.updateAvailable(payload.updateInfo));
    });

    window.stateAPI.onUpdateNotAvailable(() => {
      dispatch(updateActions.updateNotAvailable());
    });

    window.stateAPI.onUpdateDownloading(() => {
      dispatch(updateActions.startDownloading());
    });

    window.stateAPI.onUpdateProgress((payload) => {
      dispatch(updateActions.updateProgress({ percent: payload.percent }));
    });

    window.stateAPI.onUpdateDownloaded((payload) => {
      dispatch(updateActions.downloadComplete(payload.updateInfo));
    });

    window.stateAPI.onUpdateError((payload) => {
      dispatch(updateActions.setError(payload.error));
    });

    window.stateAPI.onUpdateReset(() => {
      dispatch(updateActions.resetUpdate());
    });

    // ==================== Recordings State Sync ====================

    window.stateAPI.onRecordingsCurrent((payload) => {
      dispatch(setCurrentRecording(payload.recording));
    });

    window.stateAPI.onRecordingsTitle((payload) => {
      dispatch(updateCurrentRecordingTitle(payload.title));
    });

    window.stateAPI.onRecordingsSummary((payload) => {
      dispatch(updateCurrentRecordingSummary(payload.summary));
    });

    // Cleanup function
    return () => {
      window.stateAPI.removeAllStateListeners();
    };
  }, [dispatch]);
}
