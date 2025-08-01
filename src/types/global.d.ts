// Global type declarations

import type {
  PromptTemplate,
  Settings,
  UpdateInfo,
  DownloadProgress,
  TranscriptData,
  ConnectionStatusData,
  RecordingStoppedData,
} from './common.js';

// Window interface extensions
declare global {
  interface Window {
    electronAPI: {
      // Audio loopback
      enableLoopbackAudio: () => Promise<void>;
      disableLoopbackAudio: () => Promise<void>;

      // Recording controls
      startRecording: () => Promise<boolean>;
      stopRecording: () => Promise<boolean>;
      newRecording: () => Promise<string | null>;
      summarizeTranscript: (
        recordingId?: string,
        transcript?: string
      ) => Promise<boolean>;
      sendMicrophoneAudio: (data: ArrayBuffer) => void;
      sendSystemAudio: (data: ArrayBuffer) => void;

      // Event listeners
      onTranscript: (callback: (data: TranscriptData) => void) => void;
      onSummary: (
        callback: (data: { text: string; recordingId?: string }) => void
      ) => void;
      onSummarizationStarted: (callback: () => void) => void;
      onSummarizationCompleted: (callback: () => void) => void;
      onConnectionStatus: (
        callback: (data: ConnectionStatusData) => void
      ) => void;
      onError: (callback: (message: string) => void) => void;
      onStartAudioCapture: (callback: () => void) => void;
      onStopAudioCapture: (callback: () => void) => void;
      onResetAudioProcessing: (callback: () => void) => void;
      onClearTranscripts: (callback: () => void) => void;
      onNewRecordingCreated: (callback: (recordingId: string) => void) => void;
      onRecordingStopped: (
        callback: (data: RecordingStoppedData) => void
      ) => void;
      removeAllListeners: (channel: string) => void;

      // Settings
      getSettings: () => Promise<Settings>;
      saveSettings: (settings: Partial<Settings>) => Promise<boolean>;
      savePrompt: (promptSettings: {
        summaryPrompt: string;
      }) => Promise<boolean>;
      savePrompts: (prompts: PromptTemplate[]) => Promise<boolean>;
      saveSelectedChannel: (channel: string) => Promise<boolean>;

      // Slack integration
      postToSlack: (
        message: string,
        channel: string
      ) => Promise<{ success: boolean; error?: string }>;

      // Slack OAuth
      slackOAuthInitiate: (
        clientId: string,
        clientSecret: string
      ) => Promise<void>;
      slackOAuthRemoveInstallation: () => Promise<void>;
      slackOAuthValidateChannels: (
        teamId: string,
        channelList: string
      ) => Promise<void>;
      onSlackOAuthSuccess: (
        callback: (installation: SlackInstallation) => void
      ) => void;
      onSlackOAuthError: (callback: (error: string) => void) => void;

      // Auto-updater
      installUpdate: () => Promise<void>;
      quitAndInstall: () => Promise<void>;
      checkForUpdates: () => Promise<void>;
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
      onDownloadProgress: (
        callback: (progress: DownloadProgress) => void
      ) => void;
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;

      // Recording management
      getAllRecordings: () => Promise<unknown[]>;
      searchRecordings: (query: string) => Promise<unknown[]>;
      getRecording: (id: string) => Promise<unknown>;
      loadRecording: (id: string) => Promise<boolean>;
      deleteRecording: (id: string) => Promise<boolean>;
      updateRecordingTitle: (id: string, title: string) => Promise<void>;
      updateRecordingSummary: (id: string, summary: string) => Promise<void>;
    };

    logger: {
      info: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      debug: (...args: unknown[]) => void;
    };
  }

  // Audio Worklet types
  class AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>
    ): boolean;
  }

  function registerProcessor(
    name: string,
    processorCtor: typeof AudioWorkletProcessor
  ): void;
}

export {};
