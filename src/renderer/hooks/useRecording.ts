import { useEffect, useState, useCallback, useRef } from 'react';

import { setStatus } from '../store';
import { useAppSelector, useAppDispatch } from './redux';
import type { Recording } from '../../types/common.js';
import {
  useUpdateRecordingTitleMutation,
  useUpdateRecordingSummaryMutation,
} from '../store/api/apiSlice.js';

export const useRecording = (recordingId: string | null) => {
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

  // Local state for immediate UI updates
  const [localTitle, setLocalTitle] = useState(currentRecording?.title ?? '');
  const [localSummary, setLocalSummary] = useState(
    currentRecording?.summary ?? ''
  );

  // Use local state for UI, Redux for initial load
  const summary = localSummary;
  const recordingTitle = localTitle;

  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPostingToSlack, setIsPostingToSlack] = useState(false);

  // Refs for debouncing
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const summaryDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Redux changes to local state (when recordings are loaded or summaries generated)
  useEffect(() => {
    if (currentRecording?.title !== undefined) {
      setLocalTitle(currentRecording.title);
    }
    if (currentRecording?.summary !== undefined) {
      setLocalSummary(currentRecording.summary);
    }
  }, [currentRecording?.title, currentRecording?.summary]);

  const partialTranscript = [
    microphoneTranscriptBuffer,
    systemAudioTranscriptBuffer,
  ]
    .filter(Boolean)
    .join(' ');

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
    const handleSummary = (data: { text: string }) => {
      // Update local state immediately and trigger same debounced flow as user typing
      handleSummaryChange(data.text);
    };

    const handleSummarizationStarted = () => {
      dispatch(setStatus('Generating summary...'));
      setIsSummarizing(true);
    };

    const handleSummarizationCompleted = () => {
      dispatch(setStatus('Summary complete'));
      setIsSummarizing(false);
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
  }, [dispatch, recordingId]);

  const handleToggleRecording = async () => {
    try {
      if (!isRecording) {
        setIsStarting(true);
        dispatch(setStatus('Starting recording...'));
        const result = await window.electronAPI.startRecording();
        if (result) {
          // Recording started successfully
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (isRecording) {
        setIsStopping(true);
        dispatch(setStatus('Stopping...'));
        await window.electronAPI.stopRecording();
      }
    } catch (error) {
      window.logger.error('Error toggling recording:', error);
      dispatch(setStatus('Error toggling recording'));
      setIsStopping(false);
      setIsStarting(false);
    }
  };

  const handleSummarize = async () => {
    try {
      // Don't set isSummarizing here - let the event handlers manage it
      await window.electronAPI.summarizeTranscript();
    } catch (error) {
      window.logger.error('Error generating summary:', error);
      dispatch(setStatus('Error generating summary'));
      setIsSummarizing(false);
    }
  };

  const handlePostToSlack = async (message: string, channelId: string) => {
    try {
      setIsPostingToSlack(true);
      dispatch(setStatus('Posting to Slack...'));

      const formattedMessage = (recordingTitle || '').trim()
        ? `*${recordingTitle}*\n\n${message}`
        : message;

      const result = await window.electronAPI.postToSlack(
        formattedMessage,
        channelId
      );

      if (result.success) {
        dispatch(setStatus('Posted to Slack'));
      } else {
        dispatch(setStatus(`Slack error: ${result.error ?? 'Unknown error'}`));
      }
    } catch (error) {
      window.logger.error('Error posting to Slack:', error);
      dispatch(setStatus('Error posting to Slack'));
    } finally {
      setIsPostingToSlack(false);
    }
  };

  // Immediate UI updates + debounced database writes
  const handleTitleChange = useCallback(
    (title: string) => {
      // Update UI immediately
      setLocalTitle(title);

      if (!recordingId) return;

      // Clear existing timeout
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }

      // Capture current recording ID for closure
      const currentRecordingId = recordingId;

      // Debounce database update
      titleDebounceRef.current = setTimeout(() => {
        void updateTitle({ id: currentRecordingId, title });
      }, 500); // Wait 500ms after user stops typing
    },
    [recordingId, updateTitle]
  );

  const handleSummaryChange = useCallback(
    (summaryText: string) => {
      // Update UI immediately
      setLocalSummary(summaryText);

      if (!recordingId) return;

      // Clear existing timeout
      if (summaryDebounceRef.current) {
        clearTimeout(summaryDebounceRef.current);
      }

      // Capture current recording ID for closure
      const currentRecordingId = recordingId;

      // Debounce database update
      summaryDebounceRef.current = setTimeout(() => {
        void updateSummary({ id: currentRecordingId, summary: summaryText });
      }, 500); // Wait 500ms after user stops typing
    },
    [recordingId, updateSummary]
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
