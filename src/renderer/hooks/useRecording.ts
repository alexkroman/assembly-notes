import { useEffect, useState, useCallback, useRef } from 'react';

import { useAppSelector, useAppDispatch } from './redux';
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
  const [isPostingToSlack, setIsPostingToSlack] = useState(false);

  // Refs for debouncing
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const summaryDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const partialTranscript = [
    microphoneTranscriptBuffer,
    systemAudioTranscriptBuffer,
  ]
    .filter(Boolean)
    .join(' ');

  // Immediate Redux updates + debounced database writes
  const handleSummaryChange = useCallback(
    (summaryText: string) => {
      if (!recordingId) return;

      // Update Redux immediately for UI responsiveness
      dispatch(updateCurrentRecordingSummary(summaryText));

      // Clear existing timeout
      if (summaryDebounceRef.current) {
        clearTimeout(summaryDebounceRef.current);
      }

      // Capture current recording ID for closure
      const currentRecordingId = recordingId;

      // Debounce database update
      summaryDebounceRef.current = setTimeout(() => {
        void updateSummary({ id: currentRecordingId, summary: summaryText });
      }, 300); // Wait 300ms after user stops typing
    },
    [recordingId, updateSummary, dispatch]
  );

  useEffect(() => {
    // Clear any pending debounced updates when recording changes
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    if (summaryDebounceRef.current) {
      clearTimeout(summaryDebounceRef.current);
      summaryDebounceRef.current = null;
    }
  }, [recordingId]);

  useEffect(() => {
    const handleSummary = (data: { text: string; recordingId: string }) => {
      // Only update summary if it's for the current recording
      if (recordingId && data.recordingId === recordingId) {
        // Update summary via debounced database write
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

    // Don't add audio capture handlers here - they're handled globally in main.tsx

    return () => {
      window.electronAPI.removeAllListeners('summary');
      window.electronAPI.removeAllListeners('summarization-started');
      window.electronAPI.removeAllListeners('summarization-completed');
      // Don't remove audio capture listeners - they're global
    };
  }, [dispatch, recordingId, handleSummaryChange]);

  const handleToggleRecording = async () => {
    try {
      if (!isRecording) {
        setIsStarting(true);
        dispatch(setStatus('Starting recording...'));
        const result = await window.electronAPI.startRecording();
        if (result) {
          // Recording started successfully
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
      // Don't set isSummarizing here - let the event handlers manage it
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

  const handlePostToSlack = async (message: string, channelId: string) => {
    try {
      setIsPostingToSlack(true);
      dispatch(setStatus('Posting to Slack...'));

      // Format the date similar to RecordingsList
      const dateString = currentRecording?.created_at
        ? new Date(currentRecording.created_at).toLocaleString()
        : '';

      // Build the title with date
      let titleWithDate = (recordingTitle || '').trim();
      if (titleWithDate && dateString) {
        titleWithDate = `${titleWithDate} - ${dateString}`;
      } else if (!titleWithDate && dateString) {
        titleWithDate = dateString;
      }

      // Format message with proper title
      const formattedMessage = titleWithDate
        ? `${titleWithDate}\n\n${message}`
        : message;

      const result = await window.electronAPI.postToSlack(
        formattedMessage,
        channelId
      );

      if (result.success) {
        dispatch(setStatus('Posted to Slack'));
        posthog.capture('slack_post_success', {
          recordingId: recordingId,
          channelId: channelId,
          messageLength: message.length,
        });
      } else {
        dispatch(setStatus(`Slack error: ${result.error ?? 'Unknown error'}`));
        posthog.capture('slack_post_error', {
          error: result.error ?? 'Unknown error',
        });
      }
    } catch (error) {
      window.logger.error('Error posting to Slack:', error);
      dispatch(setStatus('Error posting to Slack'));
      posthog.capture('slack_post_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsPostingToSlack(false);
    }
  };

  // Immediate Redux updates + debounced database writes
  const handleTitleChange = useCallback(
    (title: string) => {
      if (!recordingId) return;

      // Update Redux immediately for UI responsiveness
      dispatch(updateCurrentRecordingTitle(title));

      // Clear existing timeout
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }

      // Capture current recording ID for closure
      const currentRecordingId = recordingId;

      // Debounce database update
      titleDebounceRef.current = setTimeout(() => {
        void updateTitle({ id: currentRecordingId, title });
      }, 300); // Wait 300ms after user stops typing
    },
    [recordingId, updateTitle, dispatch]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
      if (summaryDebounceRef.current) {
        clearTimeout(summaryDebounceRef.current);
      }
    };
  }, []);

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
  }, [transcriptionError, isTranscribing, isRecording, isStarting, isStopping]);

  return {
    isRecording,
    isStopping,
    isStarting,
    isSummarizing,
    isPostingToSlack,
    transcript: currentTranscript,
    partialTranscript,
    summary,
    recordingTitle,
    setRecordingTitle: handleTitleChange,
    handleToggleRecording,
    handleSummarize,
    handlePostToSlack,
    setSummary: handleSummaryChange,
  };
};
