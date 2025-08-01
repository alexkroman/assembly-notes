import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  navigateToList,
  navigateToRecording,
  setShowChannelModal,
  setShowPromptModal,
  setShowSettingsModal,
  setShowUpdateModal,
  setStatus,
} from '../store';
import { ChannelModal } from './ChannelModal';
import { PromptModal } from './PromptModal';
import { RecordingsList } from './RecordingsList';
import { RecordingView } from './RecordingView';
import { SettingsModal } from './SettingsModal';
import { UpdateModal } from './UpdateModal';

export const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    currentPage,
    currentRecordingId,
    showSettingsModal,
    showPromptModal,
    showChannelModal,
    showUpdateModal,
  } = useAppSelector((state) => state.ui);
  const { status } = useAppSelector(
    (state: { recording: { status: string } }) => state.recording
  );
  const updateState = useAppSelector((state) => state.update);
  const isRecording = status === 'recording';
  const [isStoppingForNavigation, setIsStoppingForNavigation] = useState(false);

  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        if (!(settings.assemblyaiKey || '').trim()) {
          dispatch(setShowSettingsModal(true));
        }
      } catch (error) {
        console.error('Error checking initial setup:', error);
      }
    };

    void checkInitialSetup();
  }, [dispatch]);

  // Show update modal when update is available
  useEffect(() => {
    if (updateState.available && !showUpdateModal) {
      dispatch(setShowUpdateModal(true));
    }
  }, [updateState.available, showUpdateModal, dispatch]);

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
        console.error('Error stopping recording before navigation:', error);
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
    <div className="container" data-testid="app-container">
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
              dispatch(setShowPromptModal(true));
            }}
            onShowChannelModal={() => {
              dispatch(setShowChannelModal(true));
            }}
            isStoppingForNavigation={isStoppingForNavigation}
          />
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => {
            dispatch(setShowSettingsModal(false));
          }}
        />
      )}

      {showPromptModal && (
        <PromptModal
          onClose={() => {
            dispatch(setShowPromptModal(false));
          }}
        />
      )}

      {showChannelModal && (
        <ChannelModal
          onClose={() => {
            dispatch(setShowChannelModal(false));
          }}
        />
      )}

      <UpdateModal />
    </div>
  );
};
