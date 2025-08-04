import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  navigateToList,
  navigateToRecording,
  setActiveModal,
  setStatus,
} from '../store';
import { ChannelModal } from './ChannelModal';
import { PromptModal } from './PromptModal';
import { RecordingsList } from './RecordingsList';
import { RecordingView } from './RecordingView';
import { SettingsModal } from './SettingsModal';
import { useGetSettingsQuery } from '../store/api/apiSlice.js';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentPage, currentRecordingId, activeModal } = useAppSelector(
    (state) => state.ui
  );
  const { status } = useAppSelector(
    (state: { recording: { status: string } }) => state.recording
  );
  const { data: settings } = useGetSettingsQuery(undefined);
  const isRecording = status === 'recording';
  const [isStoppingForNavigation, setIsStoppingForNavigation] = useState(false);

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
    if (isRecording) {
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
      }
    } else {
      dispatch(navigateToList());
      dispatch(setStatus(''));
    }
  };

  return (
    <div className="container-flex" data-testid="app-container">
      {currentPage === 'list' && (
        <div className="page active">
          <RecordingsList onNavigateToRecording={handleNavigateToRecording} />
        </div>
      )}

      {currentPage === 'recording' && (
        <div className="page active">
          <RecordingView
            recordingId={currentRecordingId}
            onNavigateToList={() => {
              void handleNavigateToList();
            }}
            onShowPromptModal={() => {
              dispatch(setActiveModal('prompt'));
            }}
            onShowChannelModal={() => {
              dispatch(setActiveModal('channel'));
            }}
            isStoppingForNavigation={isStoppingForNavigation}
          />
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

      {activeModal === 'channel' && (
        <ChannelModal
          onClose={() => {
            dispatch(setActiveModal(null));
          }}
        />
      )}
    </div>
  );
};
