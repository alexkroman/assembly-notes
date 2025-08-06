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
  const isDictating = useAppSelector((state) => state.recording.isDictating);
  const currentRecording = useAppSelector(
    (state) =>
      (
        state.recordings as {
          currentRecording: {
            id: string;
            title: string;
            transcript?: string;
            summary?: string;
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

  const { channels, selectedChannelId, handleChannelChange } = useChannels();
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

  // Listen for dictation status changes
  useEffect(() => {
    const handleDictationStatus = (_isDictating: boolean) => {
      // Redux state will be updated from main process
    };

    window.electronAPI.onDictationStatus(handleDictationStatus);

    return () => {
      window.electronAPI.removeAllListeners('dictation-status');
    };
  }, []);

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
    return (
      element.scrollHeight - element.scrollTop - element.clientHeight <=
      threshold
    );
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
  }, [
    transcript,
    partialTranscript,
    currentRecording?.transcript,
    isNewRecording,
    scrollToBottom,
  ]);

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
    let baseClass =
      'px-2 py-1 text-xs font-semibold rounded-sm cursor-pointer transition-all duration-200 h-7 tracking-wide w-[85px] bg-[#28a745]/20 border border-[#28a745]/50 text-[#28a745] hover:bg-[#28a745]/30';
    if (isRecording)
      baseClass =
        'px-2 py-1 text-xs font-semibold rounded-sm cursor-pointer transition-all duration-200 h-7 tracking-wide w-[85px] bg-[#dc3545]/20 border-[#dc3545]/50 text-[#dc3545] hover:bg-[#dc3545]/30';
    if (isStopping || isStoppingForNavigation)
      baseClass =
        'px-2 py-1 text-xs font-semibold rounded-sm cursor-not-allowed transition-all duration-200 h-7 tracking-wide w-[85px] bg-[#ffc107]/20 border-[#ffc107]/50 text-[#ffc107] opacity-80';
    if (isStarting)
      baseClass =
        'px-2 py-1 text-xs font-semibold rounded-sm cursor-pointer transition-all duration-200 h-7 tracking-wide w-[85px] bg-[#28a745]/20 border border-[#28a745]/50 text-[#28a745] hover:bg-[#28a745]/30';
    return baseClass;
  };

  const isButtonDisabled = () => {
    return isStopping || isStarting || isStoppingForNavigation;
  };

  // Check if Slack is configured using the same method as SlackOAuthConnectionOnly
  const hasSlackConfigured = Boolean(settings.slackInstallation);

  return (
    <div
      id="recordingViewPage"
      className="page active"
      data-testid="recording-view"
    >
      <div className="flex items-center px-2 py-1 bg-[#1a1a1a] flex-shrink-0 h-7">
        <button
          type="button"
          className="text-xs text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
          data-testid="back-to-list-btn"
          onClick={onNavigateToList}
          disabled={isStoppingForNavigation}
        >
          {isStoppingForNavigation ? '← Stopping...' : '← Back to Recordings'}
        </button>
      </div>

      <div className="px-2 py-1 pt-2 bg-[#1a1a1a] flex justify-start items-center gap-1.5 flex-shrink-0 h-10">
        <input
          type="text"
          className="text-base font-semibold px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.18] rounded-sm text-white w-80 h-8 flex-shrink-0 text-left transition-all duration-200 m-0 cursor-text hover:bg-white/[0.09] hover:border-white/[0.24] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.1)] placeholder:text-white/[0.35]"
          data-testid="recording-title-input"
          placeholder="Recording title..."
          value={recordingTitle}
          onChange={(e) => {
            setRecordingTitle(e.target.value);
          }}
        />
        {isNewRecording && (
          <>
            <button
              type="button"
              className={getButtonClass().replace('h-7', 'h-8')}
              data-testid="record-button"
              onClick={() => {
                void handleToggleRecording();
              }}
              disabled={isButtonDisabled()}
            >
              {buttonText}
            </button>
            {isDictating && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-red-400 font-medium">
                  Dictating
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-2 py-1 bg-transparent flex-shrink-0 h-9">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <select
            className="px-2 py-1 text-xs bg-white/[0.09] border border-white/[0.18] rounded-sm text-white min-w-[90px] h-7 overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-200 hover:bg-white/[0.12] hover:border-white/[0.24] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12]"
            data-testid="prompt-btn"
            value={selectedPromptIndex}
            onChange={(e) => {
              if (e.target.value === 'manage') {
                onShowPromptModal();
              } else {
                handlePromptChange(parseInt(e.target.value));
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
            className="px-2 py-1 text-xs font-semibold rounded-sm cursor-pointer transition-all duration-200 h-7 tracking-wide w-[110px] bg-white/[0.09] border border-white/[0.18] text-white/[0.85] hover:bg-white/[0.12] hover:text-white disabled:text-white/[0.45] disabled:cursor-not-allowed disabled:opacity-50"
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

          {!hasSlackConfigured && (
            <span className="slack-tip text-[10px] text-white/[0.45] ml-2 italic">
              Tip: Configure Slack in Settings
            </span>
          )}

          {hasSlackConfigured && (
            <>
              <select
                className="px-2 py-1 text-xs bg-white/[0.09] border border-white/[0.18] rounded-sm text-white min-w-[90px] h-7 overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-200 hover:bg-white/[0.12] hover:border-white/[0.24] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12]"
                data-testid="channel-btn"
                value={selectedChannelId}
                onChange={(e) => {
                  if (e.target.value === 'manage') {
                    onShowChannelModal();
                  } else {
                    handleChannelChange(e.target.value);
                  }
                }}
              >
                <option value="">Post summary to...</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name} {channel.isPrivate ? '🔒' : ''}
                  </option>
                ))}
                <option value="manage">+ Manage Channels</option>
              </select>

              <button
                type="button"
                className="px-2 py-1 text-xs font-semibold rounded-sm cursor-pointer transition-all duration-200 h-7 tracking-wide w-[90px] bg-white/[0.09] border border-white/[0.18] text-white/[0.85] hover:bg-white/[0.12] hover:text-white disabled:text-white/[0.45] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void handlePostToSlack(summary, selectedChannelId);
                }}
                disabled={
                  !(summary || '').trim() ||
                  !selectedChannelId ||
                  isPostingToSlack
                }
              >
                {isPostingToSlack ? 'Posting...' : 'Post'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-1.5 px-1.5 py-1 pb-0.5 min-h-0 overflow-hidden bg-[#1a1a1a]">
        <div className="content-panel">
          <h3 className="panel-header">Transcript</h3>
          <pre
            ref={transcriptRef}
            className="panel-content"
            data-testid="transcript-area"
            onScroll={handleTranscriptScroll}
          >
            {isNewRecording ? (
              <>
                {(transcript || '').trim() || (
                  <span className="text-white/[0.35] italic text-[11px]">
                    {recordingId
                      ? ''
                      : 'Click "Record" to begin transcribing audio from your microphone and system'}
                  </span>
                )}
                {partialTranscript && (
                  <span className="inline text-partial">
                    {(transcript || '').trim()
                      ? ` ${partialTranscript}`
                      : partialTranscript}
                  </span>
                )}
              </>
            ) : (
              (currentRecording?.transcript ?? (
                <span className="text-white/[0.35] italic text-[11px]">
                  No transcript available for this recording
                </span>
              ))
            )}
          </pre>
        </div>

        <div className="content-panel">
          <h3 className="panel-header">Summary</h3>
          <textarea
            ref={summaryRef}
            className="panel-content placeholder:text-white/[0.35]"
            data-testid="summary-textarea"
            placeholder="Click 'Summarize' at any time to generate or regenerate a summary"
            onChange={handleSummaryChange}
          />
        </div>
      </div>

      <div className="px-2 py-1 pb-1.5 bg-transparent text-center flex-shrink-0 h-6 flex items-center justify-center">
        <span
          className="text-[10px] text-white/[0.60] font-normal tracking-wide"
          data-testid="status-display"
        >
          {isDictating ? (
            <span className="text-sm font-medium text-red-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Dictating - Press Ctrl+Alt+D to stop
            </span>
          ) : (
            (transcriptionError ?? uiStatus)
          )}
        </span>
      </div>
    </div>
  );
};
