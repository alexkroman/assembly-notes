import React, { useState } from 'react';

import { ConfirmModal } from './ConfirmModal';
import type { RecordingsListProps } from '../../types/components.js';
import { isEmptyString } from '../../utils/strings.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  useGetAllRecordingsQuery,
  useSearchRecordingsQuery,
  useDeleteRecordingMutation,
} from '../slices/apiSlice.js';
import { navigateToNewRecording, setActiveModal } from '../store';
import '../../types/global.d.ts';

export const RecordingsList: React.FC<RecordingsListProps> = ({
  onNavigateToRecording,
}) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const recordingStatus = useAppSelector((state) => state.recording.status);
  const isDictating = useAppSelector((state) => state.recording.isDictating);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRecordingId, setHoveredRecordingId] = useState<string | null>(
    null
  );
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

  // Check if recording is active (starting, recording, or stopping) or dictating
  const isRecordingActive =
    recordingStatus === 'starting' ||
    recordingStatus === 'recording' ||
    recordingStatus === 'stopping' ||
    isDictating;

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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const timeString = date.toLocaleString('en-US', options);
    // Split time and AM/PM, will return time wrapped in span elements
    const [time, period] = timeString.split(' ');
    return { time, period };
  };

  const formatDateHeader = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return date.toLocaleDateString('en-US', options);
    }
  };

  // Group recordings by date
  const groupRecordingsByDate = (recordingsList: typeof recordings) => {
    const grouped = recordingsList.reduce<Record<string, typeof recordings>>(
      (groups, recording) => {
        const date = new Date(recording.created_at).toDateString();
        groups[date] ??= [];
        groups[date].push(recording);
        return groups;
      },
      {}
    );

    // Sort dates in descending order (most recent first)
    return Object.entries(grouped).sort(([dateA], [dateB]) => {
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  };

  const isAssemblyAIKeyMissing = isEmptyString(settings.assemblyaiKey);

  return (
    <div
      id="recordingsListPage"
      className="page active relative h-full flex flex-col"
      data-testid="recordings-list"
    >
      <div className="px-3 py-1 bg-[#1a1a1a] flex-shrink-0 z-[100] mb-1.5">
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

      <div className="flex-1 overflow-y-auto pb-10">
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
          <div className="flex flex-col gap-4 p-3">
            {groupRecordingsByDate(recordings).map(
              ([dateString, dateRecordings]) => (
                <div key={dateString} className="flex flex-col gap-1.5">
                  <h2 className="text-xs font-semibold text-white/[0.70] uppercase tracking-wider mb-1">
                    {formatDateHeader(new Date(dateString).getTime())}
                  </h2>
                  {dateRecordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="bg-white/[0.06] rounded-lg px-4 py-2 cursor-pointer transition-all duration-200 hover:bg-white/[0.09] hover:shadow-md shadow-sm relative"
                      data-testid="recording-item"
                      onMouseEnter={() => {
                        setHoveredRecordingId(recording.id);
                      }}
                      onMouseLeave={() => {
                        setHoveredRecordingId(null);
                      }}
                      onClick={() => {
                        onNavigateToRecording(recording.id);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="m-0 text-sm font-medium text-white flex-1">
                          {recording.title ?? 'Untitled Recording'}
                        </h3>
                        <div className="flex items-center ml-auto">
                          <span
                            className={`text-xs text-white/[0.60] transition-opacity duration-200 ${hoveredRecordingId === recording.id ? 'opacity-0' : ''}`}
                          >
                            {(() => {
                              const { time, period } = formatTime(
                                recording.created_at
                              );
                              return (
                                <>
                                  {time}{' '}
                                  <span className="text-[9px]">{period}</span>
                                </>
                              );
                            })()}
                          </span>
                          <button
                            type="button"
                            className={`text-[#dc3545]/80 text-xs cursor-pointer px-2 py-1 rounded transition-all duration-200 whitespace-nowrap ml-2 hover:bg-[#dc3545]/20 hover:text-[#dc3545] absolute right-4 ${hoveredRecordingId === recording.id ? 'opacity-100' : 'opacity-0'}`}
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
              )
            )}
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

      {/* Full-screen overlay when recording is active */}
      {isRecordingActive && !isDictating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-[#1a1a1a] border border-white/20 rounded-lg px-6 py-4 shadow-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <span className="text-sm text-white/80 font-medium">
                Waiting for recording to finish
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dictation Help Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] px-4 py-2 z-50">
        <div className="relative flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 rounded border border-white/20">
                Ctrl
              </kbd>
              <span className="text-white/40 text-xs">+</span>
              <kbd className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 rounded border border-white/20">
                Opt/Alt
              </kbd>
              <span className="text-white/40 text-xs">+</span>
              <kbd className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 rounded border border-white/20">
                D
              </kbd>
            </div>
            <div className="text-[10px] text-white/60">
              <span>
                <span className="font-medium text-white/80">Dictation:</span>{' '}
                Press to dictate in any app. Words appear where your cursor is.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
