import { useEffect, useState, useCallback } from 'react';

import { useAppSelector, useAppDispatch } from './redux';
import { useDebouncedCallbackWithCancel } from './useDebouncedCallback';
import { usePostHog } from './usePostHog';
import type { Recording } from '../../types/common.js';
import {
  useUpdateRecordingTitleMutation,
  useUpdateRecordingSummaryMutation,
} from '../slices/apiSlice.js';
import {
  updateCurrentRecordingTitle,
  updateCurrentRecordingSummary,
} from '../slices/recordingsSlice.js';
import { setStatus } from '../store';

export const useRecording = (recordingId: string | null) => {
  const posthog = usePostHog();
  const recordingState = useAppSelector(
    (state: { recording: { status: string; error: string | null } }) =>
      state.recording
  );
  const isRecording = recordingState.status === 'recording';
  const {
    currentTranscript,
    microphoneTranscriptBuffer,
    systemAudioTranscriptBuffer,
    isTranscribing,
    error: transcriptionError,
  } = useAppSelector(
    (state: {
      transcription: {
        currentTranscript: string;
        microphoneTranscriptBuffer: string;
        systemAudioTranscriptBuffer: string;
        isTranscribing: boolean;
        error: string | null;
      };
    }) => state.transcription
  );
  const dispatch = useAppDispatch();

  // Load recording into Redux store when recordingId changes
  useEffect(() => {
    if (recordingId) {
      window.electronAPI.loadRecording(recordingId).catch((error: unknown) => {
        window.logger.error('Failed to load recording:', error);
      });
    }
  }, [recordingId]);

  // Get current recording from Redux store (synced from main process)
  const currentRecording = useAppSelector(
    (state) =>
      (state.recordings as { currentRecording: Recording | null })
        .currentRecording
  );

  const [updateTitle] = useUpdateRecordingTitleMutation();
  const [updateSummary] = useUpdateRecordingSummaryMutation();

  // Use Redux state directly
  const summary = currentRecording?.summary ?? '';
  const recordingTitle = currentRecording?.title ?? '';

  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Debounced database updates
  const [debouncedTitleUpdate, cancelTitleUpdate] =
    useDebouncedCallbackWithCancel(
      useCallback(
        (id: string, title: string) => {
          void updateTitle({ id, title });
        },
        [updateTitle]
      ),
      300
    );

  const [debouncedSummaryUpdate, cancelSummaryUpdate] =
    useDebouncedCallbackWithCancel(
      useCallback(
        (id: string, summaryText: string) => {
          void updateSummary({ id, summary: summaryText });
        },
        [updateSummary]
      ),
      300
    );

  const partialTranscript = [
    microphoneTranscriptBuffer,
    systemAudioTranscriptBuffer,
  ]
    .filter(Boolean)
    .join(' ');

  // Immediate Redux updates + debounced database writes
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!recordingId) return;
      dispatch(updateCurrentRecordingTitle(title));
      debouncedTitleUpdate(recordingId, title);
    },
    [recordingId, dispatch, debouncedTitleUpdate]
  );

  const handleSummaryChange = useCallback(
    (summaryText: string) => {
      if (!recordingId) return;
      dispatch(updateCurrentRecordingSummary(summaryText));
      debouncedSummaryUpdate(recordingId, summaryText);
    },
    [recordingId, dispatch, debouncedSummaryUpdate]
  );

  // Clear pending debounced updates when recording changes
  useEffect(() => {
    cancelTitleUpdate();
    cancelSummaryUpdate();
  }, [recordingId, cancelTitleUpdate, cancelSummaryUpdate]);

  useEffect(() => {
    const handleSummary = (data: { text: string; recordingId: string }) => {
      // Only update summary if it's for the current recording
      if (recordingId && data.recordingId === recordingId) {
        handleSummaryChange(data.text);
      } else {
        window.logger.warn(
          `Ignoring summary for different recording. Current: ${recordingId ?? 'none'}, Received: ${data.recordingId}`
        );
      }
    };

    const handleSummarizationStarted = () => {
      dispatch(setStatus('Generating summary...'));
      setIsSummarizing(true);
    };

    const handleSummarizationCompleted = () => {
      dispatch(setStatus('Summary complete'));
      setIsSummarizing(false);
      posthog.capture('summary_completed', {
        recordingId: recordingId,
      });
    };

    window.electronAPI.onSummary(handleSummary);
    window.electronAPI.onSummarizationStarted(handleSummarizationStarted);
    window.electronAPI.onSummarizationCompleted(handleSummarizationCompleted);

    return () => {
      window.electronAPI.removeAllListeners('summary');
      window.electronAPI.removeAllListeners('summarization-started');
      window.electronAPI.removeAllListeners('summarization-completed');
    };
  }, [dispatch, recordingId, handleSummaryChange, posthog]);

  const handleToggleRecording = async () => {
    try {
      if (!isRecording) {
        setIsStarting(true);
        dispatch(setStatus('Starting recording...'));
        const result = await window.electronAPI.startRecording();
        if (result) {
          posthog.capture('recording_started', {
            recordingId: recordingId,
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (isRecording) {
        setIsStopping(true);
        dispatch(setStatus('Stopping...'));
        await window.electronAPI.stopRecording();
        posthog.capture('recording_stopped', {
          recordingId: recordingId,
          transcriptLength: currentTranscript.length,
        });
      }
    } catch (error) {
      window.logger.error('Error toggling recording:', error);
      dispatch(setStatus('Error toggling recording'));
      setIsStopping(false);
      setIsStarting(false);
      posthog.capture('recording_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: isRecording ? 'stop' : 'start',
      });
    }
  };

  const handleSummarize = async () => {
    try {
      posthog.capture('summary_requested', {
        recordingId: recordingId,
        transcriptLength: currentTranscript.length,
      });
      await window.electronAPI.summarizeTranscript();
    } catch (error) {
      window.logger.error('Error generating summary:', error);
      dispatch(setStatus('Error generating summary'));
      setIsSummarizing(false);
      posthog.capture('summary_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Reset loading states when recording state changes
  useEffect(() => {
    if (!isRecording && isStopping) {
      setIsStopping(false);
    }
    if (isRecording && isStarting) {
      setIsStarting(false);
    }
  }, [isRecording, isStopping, isStarting]);

  useEffect(() => {
    if (isStarting || isStopping) {
      return;
    }

    if (transcriptionError) {
      dispatch(setStatus(`Error: ${transcriptionError}`));
    } else if (isTranscribing) {
      dispatch(setStatus('Transcribing...'));
    } else if (isRecording) {
      dispatch(setStatus('Recording...'));
    } else {
      dispatch(setStatus('Ready to record'));
    }
  }, [
    transcriptionError,
    isTranscribing,
    isRecording,
    isStarting,
    isStopping,
    dispatch,
  ]);

  return {
    isRecording,
    isStopping,
    isStarting,
    isSummarizing,
    transcript: currentTranscript,
    partialTranscript,
    summary,
    recordingTitle,
    setRecordingTitle: handleTitleChange,
    handleToggleRecording,
    handleSummarize,
    setSummary: handleSummaryChange,
  };
};
