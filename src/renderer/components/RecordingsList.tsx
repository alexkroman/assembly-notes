import React, { useState } from 'react';

import type { RecordingsListProps } from '../../types/components.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { navigateToNewRecording, setActiveModal } from '../store';
import { ConfirmModal } from './ConfirmModal';
import {
  useGetAllRecordingsQuery,
  useSearchRecordingsQuery,
  useDeleteRecordingMutation,
} from '../store/api/apiSlice.js';
import '../../types/global.d.ts';

export const RecordingsList: React.FC<RecordingsListProps> = ({
  onNavigateToRecording,
}) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const recordingStatus = useAppSelector((state) => state.recording.status);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    recordingId: string | null;
  }>({ isOpen: false, recordingId: null });

  // Use conditional queries based on search state
  const shouldSearch = searchQuery.trim().length > 0;

  const {
    data: allRecordings = [],
    isLoading: isLoadingAll,
    error: allRecordingsError,
    refetch: refetchAll,
  } = useGetAllRecordingsQuery(undefined, {
    skip: shouldSearch,
  });

  const {
    data: searchResults = [],
    isLoading: isSearching,
    error: searchError,
  } = useSearchRecordingsQuery(searchQuery, {
    skip: !shouldSearch,
  });

  const [deleteRecording] = useDeleteRecordingMutation();

  // Determine which data to display
  const recordings = shouldSearch ? searchResults : allRecordings;
  const loading = shouldSearch ? isSearching : isLoadingAll;
  const error = shouldSearch ? searchError : allRecordingsError;

  // Check if recording is active (starting, recording, or stopping)
  const isRecordingActive =
    recordingStatus === 'starting' ||
    recordingStatus === 'recording' ||
    recordingStatus === 'stopping';

  // No useEffect needed - RTK Query handles data fetching automatically

  const handleNewRecording = async () => {
    try {
      const recordingId = await window.electronAPI.newRecording();
      if (recordingId) {
        dispatch(navigateToNewRecording(recordingId));
      }
    } catch (error) {
      window.logger.error('Error creating new recording:', error);
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
      await deleteRecording(deleteModal.recordingId).unwrap();
      // RTK Query will automatically refetch the data
    } catch (error) {
      window.logger.error('Error deleting recording:', error);
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
      className="page active overflow-y-auto"
      data-testid="recordings-list"
    >
      <div className="px-3 py-1 bg-[#1a1a1a] sticky top-0 z-[100] mb-1.5">
        <div className="flex items-center gap-3 h-8">
          <div className="flex-1">
            <input
              type="text"
              className="w-full px-2 py-1 text-xs bg-white/[0.09] border border-white/[0.18] rounded-sm text-white h-8 box-border transition-all duration-200 placeholder:text-white/[0.35] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12]"
              data-testid="search-input"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={`px-3 h-8 rounded-sm bg-[#28a745]/20 border border-[#28a745]/50 text-[#28a745] text-xs font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center whitespace-nowrap flex-shrink-0 hover:bg-[#28a745]/30 ${isAssemblyAIKeyMissing || isRecordingActive ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              className={`px-2 h-8 rounded-sm bg-white/[0.12] border border-white/[0.24] text-white text-sm cursor-pointer transition-all duration-200 flex items-center justify-center whitespace-nowrap flex-shrink-0 min-w-[32px] hover:bg-white/[0.05] ${isRecordingActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid="settings-button"
              onClick={() => {
                if (!isRecordingActive) {
                  dispatch(setActiveModal('settings'));
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

      <div className="flex-1">
        {error ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <h2 className="text-lg font-medium text-white mb-2">
                Error loading recordings
              </h2>
              <p className="text-sm text-white/[0.70] mb-4">
                Please try again later
              </p>
              <button
                className="px-4 py-2 bg-white/[0.09] border border-white/[0.18] text-white/[0.85] rounded-sm cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-white/[0.12] hover:text-white"
                onClick={() => {
                  if (!shouldSearch) void refetchAll();
                }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-10 text-center text-sm text-white/[0.60]">
            Loading recordings...
          </div>
        ) : recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/[0.70] text-center gap-2">
            <div>
              {searchQuery ? (
                <>
                  <h2 className="m-0 text-lg font-medium">
                    No recordings found
                  </h2>
                  <p className="m-0 text-sm">
                    No recordings match your search for "{searchQuery}"
                  </p>
                </>
              ) : (
                <>
                  <h2 className="m-0 text-lg font-medium">No recordings yet</h2>
                  <p className="m-0 text-sm">
                    Click "New Recording" to get started
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3 pb-4">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-white/[0.06] rounded-lg px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-white/[0.09] hover:shadow-md shadow-sm relative"
                data-testid="recording-item"
                onClick={() => {
                  onNavigateToRecording(recording.id);
                }}
              >
                <div className="flex justify-between items-center group/item">
                  <h3 className="m-0 text-sm font-medium text-white flex-1">
                    {recording.title ?? 'Untitled Recording'}
                  </h3>
                  <div className="flex items-center ml-auto">
                    <span className="text-xs text-white/[0.60] transition-opacity duration-200 group-hover/item:opacity-0">
                      {formatDate(recording.created_at)}
                    </span>
                    <button
                      type="button"
                      className="opacity-0 text-[#dc3545]/80 text-xs cursor-pointer px-2 py-1 rounded transition-all duration-200 whitespace-nowrap ml-2 group-hover/item:opacity-100 hover:bg-[#dc3545]/20 hover:text-[#dc3545] absolute right-4"
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
