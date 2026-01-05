import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  navigateToList,
  navigateToRecording,
  setActiveModal,
  setStatus,
} from '../store';
import { ErrorBoundary } from './ErrorBoundary';
import { PromptModal } from './PromptModal';
import { RecordingErrorBoundary } from './RecordingErrorBoundary';
import { RecordingsList } from './RecordingsList';
import { RecordingView } from './RecordingView';
import { SettingsModal } from './SettingsModal';
import { usePostHog } from '../hooks/usePostHog';
import { useGetSettingsQuery, apiSlice } from '../slices/apiSlice.js';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const posthog = usePostHog();
  const { currentPage, currentRecordingId, activeModal } = useAppSelector(
    (state) => state.ui
  );
  const { status, isDictating } = useAppSelector(
    (state: { recording: { status: string; isDictating: boolean } }) =>
      state.recording
  );
  const { data: settings } = useGetSettingsQuery(undefined);
  const isRecording = status === 'recording';
  const [isStoppingForNavigation, setIsStoppingForNavigation] = useState(false);

  // Identify user in PostHog when settings are loaded
  useEffect(() => {
    if (settings?.userId) {
      posthog.identify(settings.userId);
    }
  }, [settings?.userId, posthog]);

  useEffect(() => {
    // Check if settings are loaded and AssemblyAI key is missing
    if (settings && !(settings.assemblyaiKey || '').trim()) {
      dispatch(setActiveModal('settings'));
    }
  }, [settings, dispatch]);

  useEffect(() => {
    const handleStopAudioCapture = () => {
      if (isStoppingForNavigation) {
        setIsStoppingForNavigation(false);
        dispatch(navigateToList());
        dispatch(setStatus(''));
        // Invalidate recordings list to force reload
        dispatch(apiSlice.util.invalidateTags(['RecordingsList']));
      }
    };

    window.electronAPI.onStopAudioCapture(handleStopAudioCapture);

    return () => {
      window.electronAPI.removeAllListeners('stop-audio-capture');
    };
  }, [isStoppingForNavigation, dispatch]);

  const handleNavigateToRecording = (recordingId?: string) => {
    dispatch(navigateToRecording(recordingId));
  };

  const handleNavigateToList = async () => {
    if (isRecording || isDictating) {
      try {
        setIsStoppingForNavigation(true);
        dispatch(setStatus('Stopping and going back to recordings'));
        await window.electronAPI.stopRecording();
      } catch (error) {
        window.logger.error(
          'Error stopping recording before navigation:',
          error
        );
        setIsStoppingForNavigation(false);
        dispatch(navigateToList());
        dispatch(setStatus(''));
        // Invalidate recordings list to force reload
        dispatch(apiSlice.util.invalidateTags(['RecordingsList']));
      }
    } else {
      dispatch(navigateToList());
      dispatch(setStatus(''));
      // Invalidate recordings list to force reload
      dispatch(apiSlice.util.invalidateTags(['RecordingsList']));
    }
  };

  return (
    <ErrorBoundary>
      <div className="container-flex" data-testid="app-container">
        {currentPage === 'list' && (
          <div className="page active">
            <ErrorBoundary>
              <RecordingsList
                onNavigateToRecording={handleNavigateToRecording}
              />
            </ErrorBoundary>
          </div>
        )}

        {currentPage === 'recording' && (
          <div className="page active">
            <RecordingErrorBoundary>
              <RecordingView
                recordingId={currentRecordingId}
                onNavigateToList={() => {
                  void handleNavigateToList();
                }}
                onShowPromptModal={() => {
                  dispatch(setActiveModal('prompt'));
                }}
                isStoppingForNavigation={isStoppingForNavigation}
              />
            </RecordingErrorBoundary>
          </div>
        )}

        {activeModal === 'settings' && (
          <SettingsModal
            onClose={() => {
              dispatch(setActiveModal(null));
            }}
          />
        )}

        {activeModal === 'prompt' && (
          <PromptModal
            onClose={() => {
              dispatch(setActiveModal(null));
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};
