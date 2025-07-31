import React, { useEffect, useRef, useCallback } from 'react';

import type { RecordingViewProps } from '../../types/components.js';
import { useAppSelector } from '../hooks/redux';
import { useChannels } from '../hooks/useChannels';
import { usePrompts } from '../hooks/usePrompts';
import { useRecording } from '../hooks/useRecording';

export const RecordingView: React.FC<RecordingViewProps> = ({
  recordingId,
  onNavigateToList,
  onShowPromptModal,
  onShowChannelModal,
  isStoppingForNavigation = false,
}) => {
  const { isNewRecording } = useAppSelector((state) => state.ui);
  const settings = useAppSelector((state) => state.settings);
  const transcriptionError = useAppSelector(
    (state) => (state.transcription as { error: string | null }).error
  );
  const uiStatus = useAppSelector((state) => state.ui.status);
  const currentRecording = useAppSelector(
    (state) =>
      (
        state.recordings as {
          currentRecording: {
            id: string;
            title: string;
            transcript?: string;
          } | null;
        }
      ).currentRecording
  );
  const {
    isRecording,
    isStopping,
    isStarting,
    isSummarizing,
    isPostingToSlack,
    transcript,
    partialTranscript,
    summary,
    recordingTitle,
    setRecordingTitle,
    handleToggleRecording,
    handleSummarize,
    handlePostToSlack,
    setSummary,
  } = useRecording(recordingId);

  const { channels, selectedChannel, handleChannelChange } = useChannels();
  const { prompts, selectedPromptIndex, handlePromptChange } = usePrompts();

  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoStarted = useRef(false);
  const transcriptRef = useRef<HTMLPreElement>(null);
  const isUserScrolled = useRef(false);
  const lastTranscriptLength = useRef(0);

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.value = summary;
    }
  }, [summary]);

  useEffect(() => {
    if (
      recordingId &&
      isNewRecording &&
      !hasAutoStarted.current &&
      !isRecording &&
      !isStopping &&
      !isStarting
    ) {
      hasAutoStarted.current = true;
      void handleToggleRecording();
    }
  }, [
    recordingId,
    isNewRecording,
    isRecording,
    isStopping,
    isStarting,
    handleToggleRecording,
  ]);

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummary(e.target.value);
  };

  const checkIfAtBottom = useCallback((element: HTMLElement) => {
    const threshold = 50; // Allow 50px from bottom to be considered "at bottom"
    return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
  }, []);

  const scrollToBottom = useCallback((element: HTMLElement) => {
    element.scrollTop = element.scrollHeight;
  }, []);

  const handleTranscriptScroll = useCallback(() => {
    if (!transcriptRef.current) return;
    
    const atBottom = checkIfAtBottom(transcriptRef.current);
    isUserScrolled.current = !atBottom;
  }, [checkIfAtBottom]);

  // Auto-scroll when transcript updates
  useEffect(() => {
    const currentTranscript = isNewRecording 
      ? (transcript || '') + (partialTranscript || '')
      : (currentRecording?.transcript ?? '');
    
    const currentLength = currentTranscript.length;
    
    if (transcriptRef.current && currentLength > lastTranscriptLength.current) {
      if (!isUserScrolled.current) {
        scrollToBottom(transcriptRef.current);
      }
    }
    
    lastTranscriptLength.current = currentLength;
  }, [transcript, partialTranscript, currentRecording?.transcript, isNewRecording, scrollToBottom]);

  const getButtonText = () => {
    if (isStopping || isStoppingForNavigation) {
      return 'Stopping...';
    }
    if (isStarting) {
      return 'Starting...';
    }
    return isRecording ? 'Stop' : 'Start';
  };

  const buttonText = getButtonText();

  const getButtonClass = () => {
    let baseClass = 'record-btn';
    if (isRecording) baseClass += ' recording';
    if (isStopping || isStoppingForNavigation) baseClass += ' stopping';
    if (isStarting) baseClass += ' starting';
    return baseClass;
  };

  const isButtonDisabled = () => {
    return isStopping || isStarting || isStoppingForNavigation;
  };

  // Use computed properties instead of direct trim operations
  const hasSlackToken = settings.hasSlackBotToken;

  return (
    <div
      id="recordingViewPage"
      className="page active"
      data-testid="recording-view"
    >
      <div className="recording-header">
        <button
          type="button"
          className="back-btn"
          data-testid="back-to-list-btn"
          onClick={onNavigateToList}
          disabled={isStoppingForNavigation}
        >
          {isStoppingForNavigation ? '← Stopping...' : '← Back to Recordings'}
        </button>
      </div>

      <div className="title-section">
        <input
          type="text"
          className="title-input"
          data-testid="recording-title-input"
          placeholder="Recording title..."
          value={recordingTitle}
          onChange={(e) => {
            setRecordingTitle(e.target.value);
          }}
        />
      </div>

      <div className="controls-section">
        <div className="controls-row">
          {isNewRecording && (
            <button
              type="button"
              className={getButtonClass()}
              data-testid="record-button"
              onClick={() => {
                void handleToggleRecording();
              }}
              disabled={isButtonDisabled()}
            >
              {buttonText}
            </button>
          )}

          <select
            className="prompt-select"
            data-testid="prompt-btn"
            value={selectedPromptIndex}
            onChange={(e) => {
              if (e.target.value === 'manage') {
                onShowPromptModal();
              } else {
                void handlePromptChange(parseInt(e.target.value));
              }
            }}
          >
            {prompts.map((prompt, index) => (
              <option key={index} value={index}>
                {prompt.name}
              </option>
            ))}
            <option value="manage">+ Manage Prompts</option>
          </select>

          <button
            type="button"
            className="summary-btn"
            data-testid="summarize-btn"
            onClick={() => {
              void handleSummarize();
            }}
            disabled={
              !(isNewRecording
                ? (transcript || '').trim()
                : (currentRecording?.transcript?.trim() ?? '')) || isSummarizing
            }
          >
            {isSummarizing ? 'Summarizing...' : 'Summarize'}
          </button>

          {!hasSlackToken && (
            <span
              className="slack-tip"
              style={{
                color: '#888',
                fontSize: '10px',
                marginLeft: '8px',
                fontStyle: 'italic',
              }}
            >
              Tip: Configure Slack in Settings
            </span>
          )}

          {hasSlackToken && (
            <>
              <select
                className="channel-select"
                data-testid="channel-btn"
                value={selectedChannel}
                onChange={(e) => {
                  if (e.target.value === 'manage') {
                    onShowChannelModal();
                  } else {
                    void handleChannelChange(e.target.value);
                  }
                }}
              >
                <option value="">Choose channel...</option>
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
                <option value="manage">+ Manage Channels</option>
              </select>

              <button
                type="button"
                className="slack-btn"
                onClick={() => {
                  void handlePostToSlack(summary, selectedChannel);
                }}
                disabled={
                  !(summary || '').trim() ||
                  !selectedChannel ||
                  isPostingToSlack
                }
              >
                {isPostingToSlack ? 'Posting...' : 'Post'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="content-section">
        <div className="content-panel">
          <h3>Transcript</h3>
          <pre 
            ref={transcriptRef}
            className="panel-content" 
            data-testid="transcript-area"
            onScroll={handleTranscriptScroll}
          >
            {isNewRecording ? (
              <>
                {(transcript || '').trim() || (
                  <span className="placeholder-text">
                    {recordingId
                      ? ''
                      : 'Click "Record" to begin transcribing audio from your microphone and system'}
                  </span>
                )}
                {partialTranscript && (
                  <span className="partial-transcript">
                    {(transcript || '').trim()
                      ? ` ${partialTranscript}`
                      : partialTranscript}
                  </span>
                )}
              </>
            ) : (
              (currentRecording?.transcript ?? (
                <span className="placeholder-text">
                  No transcript available for this recording
                </span>
              ))
            )}
          </pre>
        </div>

        <div className="content-panel">
          <h3>Summary</h3>
          <textarea
            ref={summaryRef}
            className="panel-content"
            data-testid="summary-textarea"
            placeholder="Click 'Summarize' at any time to generate or regenerate a summary"
            onChange={handleSummaryChange}
          />
        </div>
      </div>

      <div className="status-section">
        <span className="status" data-testid="status-display">
          {transcriptionError ?? uiStatus}
        </span>
      </div>
    </div>
  );
};
