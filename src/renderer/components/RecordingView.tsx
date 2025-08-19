import React, { useEffect, useRef, useCallback, useState } from 'react';

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const recordingStartTime = useRef<number | null>(null);

  useEffect(() => {
    if (summaryRef.current) {
      summaryRef.current.value = summary;
    }
  }, [summary]);

  // Track recording duration
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isRecording) {
      recordingStartTime.current ??= Date.now();

      // Update duration every 100ms for smooth display
      intervalId = setInterval(() => {
        const elapsed =
          (Date.now() - (recordingStartTime.current ?? Date.now())) / 1000;
        setCurrentTime(elapsed);
        setDuration(elapsed);
      }, 100);
    } else {
      recordingStartTime.current = null;
      // When recording stops, reset currentTime to 0
      if (!audioUrl) {
        setCurrentTime(0);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording]);

  // Load audio file when recording changes or stops
  useEffect(() => {
    async function loadAudio() {
      if (recordingId) {
        const filepath = await window.electronAPI.getAudioFilePath(recordingId);
        if (filepath) {
          // Convert file path to file:// URL for audio element
          const fileUrl = `file://${filepath}`;
          setAudioUrl(fileUrl);
        } else {
          setAudioUrl(null);
        }
      } else {
        setAudioUrl(null);
      }
    }
    void loadAudio();
  }, [recordingId, isNewRecording, isRecording]);

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

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString()}:${secs.toString().padStart(2, '0')}`;
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
          className="text-base font-semibold px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.18] rounded-sm text-white flex-1 h-8 text-left transition-all duration-200 m-0 cursor-text hover:bg-white/[0.09] hover:border-white/[0.24] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12] focus:shadow-[0_0_0_2px_rgba(255,255,255,0.1)] placeholder:text-white/[0.35]"
          data-testid="recording-title-input"
          placeholder="Recording title..."
          value={recordingTitle}
          onChange={(e) => {
            setRecordingTitle(e.target.value);
          }}
        />
      </div>

      <div className="px-2 py-1 bg-transparent flex-shrink-0 h-9">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <select
            className="px-2 py-1 text-xs bg-white/[0.09] border border-white/[0.18] rounded-sm text-white flex-1 h-7 overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-200 hover:bg-white/[0.12] hover:border-white/[0.24] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12]"
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
                className="px-2 py-1 text-xs bg-white/[0.09] border border-white/[0.18] rounded-sm text-white flex-1 h-7 overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-200 hover:bg-white/[0.12] hover:border-white/[0.24] focus:outline-none focus:border-white/[0.45] focus:bg-white/[0.12]"
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

      {/* Unified Audio/Recording Control - Always visible */}
      <div className="px-2 py-1 bg-[#1a1a1a] flex items-center gap-1 flex-shrink-0 h-10">
        <button
          type="button"
          className={`px-2 py-1 text-xs font-semibold rounded-sm transition-all duration-200 h-7 tracking-wide w-[85px] ${
            isRecording || isPlaying
              ? 'cursor-pointer bg-[#dc3545]/20 border border-[#dc3545]/50 text-[#dc3545] hover:bg-[#dc3545]/30'
              : isStopping || isStarting
                ? 'cursor-not-allowed bg-[#ffc107]/20 border border-[#ffc107]/50 text-[#ffc107] opacity-80'
                : (audioUrl && !isNewRecording) || isNewRecording
                  ? 'cursor-pointer bg-white/[0.09] border border-white/[0.18] text-white/[0.85] hover:bg-white/[0.12] hover:text-white'
                  : 'cursor-not-allowed bg-white/[0.04] border border-white/[0.08] text-white/[0.25]'
          }`}
          onClick={() => {
            if (isRecording) {
              void handleToggleRecording();
            } else if (isPlaying) {
              handlePlayPause();
            } else if (!audioUrl) {
              void handleToggleRecording();
            } else if (audioUrl) {
              handlePlayPause();
            }
          }}
          disabled={isStopping || isStarting}
        >
          {isStopping
            ? 'Stopping...'
            : isStarting
              ? 'Starting...'
              : isRecording || isPlaying
                ? 'Stop'
                : !audioUrl
                  ? 'Record'
                  : 'Play'}
        </button>
        <span
          className={`text-[10px] min-w-[35px] text-right ${isRecording ? 'text-[#dc3545]' : audioUrl ? 'text-white/[0.6]' : 'text-white/[0.25]'}`}
        >
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={isRecording ? 100 : duration || 1}
          step="0.01"
          value={isRecording ? 100 : currentTime}
          onChange={handleSeek}
          disabled={!audioUrl || isRecording}
          className={`flex-1 h-1 rounded-lg appearance-none slider ${
            isRecording
              ? 'recording-slider bg-white/[0.08] cursor-not-allowed'
              : audioUrl
                ? 'bg-white/[0.2] cursor-pointer'
                : 'bg-white/[0.08] cursor-not-allowed'
          }`}
          style={{
            background: isRecording
              ? `linear-gradient(to right, #dc3545 0%, #dc3545 100%, rgba(255, 255, 255, 0.3) 100%, rgba(255, 255, 255, 0.3) 100%)`
              : audioUrl && duration > 0
                ? `linear-gradient(to right, #28a745 0%, #28a745 ${((currentTime / duration) * 100).toFixed(2)}%, rgba(255, 255, 255, 0.3) ${((currentTime / duration) * 100).toFixed(2)}%, rgba(255, 255, 255, 0.3) 100%)`
                : undefined,
          }}
        />
        <span
          className={`text-[10px] min-w-[35px] ${isRecording ? 'text-[#dc3545]' : audioUrl ? 'text-white/[0.6]' : 'text-white/[0.25]'}`}
        >
          {formatTime(duration)}
        </span>
        {audioUrl && !isRecording && (
          <button
            type="button"
            className="text-[10px] text-white/[0.5] hover:text-white/[0.8] transition-colors duration-200 cursor-pointer ml-1 px-1"
            title="Show audio file in Finder"
            onClick={() => {
              if (recordingId) {
                void window.electronAPI.showAudioInFolder(recordingId);
              }
            }}
          >
            📁
          </button>
        )}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
