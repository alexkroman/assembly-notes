import React, { useEffect, useState } from 'react';

import type { RecordingsListProps } from '../../types/components.js';
import type { Recording } from '../../types/index.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { navigateToNewRecording, setShowSettingsModal } from '../store';
import { ConfirmModal } from './ConfirmModal';
import '../../types/global.d.ts';

export const RecordingsList: React.FC<RecordingsListProps> = ({
  onNavigateToRecording,
}) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const recordingStatus = useAppSelector((state) => state.recording.status);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    recordingId: string | null;
  }>({ isOpen: false, recordingId: null });
  // Check if recording is active (starting, recording, or stopping)
  const isRecordingActive =
    recordingStatus === 'starting' ||
    recordingStatus === 'recording' ||
    recordingStatus === 'stopping';

  useEffect(() => {
    void loadRecordings();
  }, []);

  useEffect(() => {
    const searchDebounced = setTimeout(() => {
      void searchRecordings();
    }, 300);

    return () => {
      clearTimeout(searchDebounced);
    };
  }, [searchQuery]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const allRecordings = await window.electronAPI.getAllRecordings();
      setRecordings(allRecordings as Recording[]);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchRecordings = async () => {
    try {
      setLoading(true);
      const searchResults =
        await window.electronAPI.searchRecordings(searchQuery);
      setRecordings(searchResults as Recording[]);
    } catch (error) {
      console.error('Error searching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRecording = async () => {
    try {
      const recordingId = await window.electronAPI.newRecording();
      if (recordingId) {
        dispatch(navigateToNewRecording(recordingId));
      }
    } catch (error) {
      console.error('Error creating new recording:', error);
    }
  };

  const handleDeleteRecording = (
    recordingId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setDeleteModal({ isOpen: true, recordingId });
  };

  const confirmDeleteRecording = async () => {
    if (!deleteModal.recordingId) return;

    try {
      await window.electronAPI.deleteRecording(deleteModal.recordingId);
      await loadRecordings(); // Refresh the list
    } catch (error) {
      console.error('Error deleting recording:', error);
    } finally {
      setDeleteModal({ isOpen: false, recordingId: null });
    }
  };

  const cancelDeleteRecording = () => {
    setDeleteModal({ isOpen: false, recordingId: null });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isAssemblyAIKeyMissing = !(settings.assemblyaiKey || '').trim();

  return (
    <div
      id="recordingsListPage"
      className="page active"
      data-testid="recordings-list"
    >
      <div className="list-header">
        <div className="header-content">
          <h1>Assembly Notes</h1>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              data-testid="search-input"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
          </div>
          <div className="header-buttons">
            <button
              type="button"
              className={`new-btn ${isAssemblyAIKeyMissing || isRecordingActive ? 'disabled' : ''}`}
              data-testid="new-recording-btn"
              onClick={() => {
                if (!isAssemblyAIKeyMissing && !isRecordingActive) {
                  void handleNewRecording();
                }
              }}
              disabled={isAssemblyAIKeyMissing || isRecordingActive}
              title={
                isRecordingActive
                  ? 'Please wait for the current recording to finish'
                  : undefined
              }
            >
              New Recording
            </button>
            <button
              type="button"
              className={`settings-btn ${isRecordingActive ? 'disabled' : ''}`}
              data-testid="settings-button"
              onClick={() => {
                if (!isRecordingActive) {
                  dispatch(setShowSettingsModal(true));
                }
              }}
              disabled={isRecordingActive}
              title={
                isRecordingActive
                  ? 'Please wait for the current recording to finish'
                  : undefined
              }
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div className="list-container">
        {loading ? (
          <div className="loading">Loading recordings...</div>
        ) : recordings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-content">
              {searchQuery ? (
                <>
                  <h2>No recordings found</h2>
                  <p>No recordings match your search for "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <h2>No recordings yet</h2>
                  <p>Click "New Recording" to get started</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="recordings-list">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="recording-item"
                data-testid="recording-item"
                onClick={() => {
                  onNavigateToRecording(recording.id);
                }}
              >
                <div className="recording-header">
                  <h3 className="recording-title">
                    {recording.title ?? 'Untitled Recording'}
                  </h3>
                  <div className="recording-meta">
                    <span className="recording-date">
                      {formatDate(recording.created_at)}
                    </span>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={(e) => {
                        handleDeleteRecording(recording.id, e);
                      }}
                      title="Delete recording"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Recording"
        message="Are you sure you want to delete this recording? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          void confirmDeleteRecording();
        }}
        onCancel={cancelDeleteRecording}
      />
    </div>
  );
};
