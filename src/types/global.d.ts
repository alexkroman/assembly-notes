/**
 * Global Type Declarations
 *
 * Extends the Window interface with electronAPI, stateAPI, and logger.
 * These are exposed via contextBridge in the preload script.
 */

import type {
  PromptTemplate,
  Settings,
  UpdateInfo,
  DownloadProgress,
  Recording,
} from './common.js';
import type { StateAPI } from './ipc-events.js';

declare global {
  interface Window {
    electronAPI: {
      // Audio Loopback
      enableLoopbackAudio: () => Promise<void>;
      disableLoopbackAudio: () => Promise<void>;

      // Recording Control
      startRecording: () => Promise<boolean>;
      stopRecording: () => Promise<boolean>;
      newRecording: () => Promise<string | null>;
      loadRecording: (id: string) => Promise<boolean>;
      summarizeTranscript: (transcript?: string) => Promise<boolean>;

      // Recording Data
      getAllRecordings: () => Promise<Recording[]>;
      searchRecordings: (query: string) => Promise<Recording[]>;
      getRecording: (id: string) => Promise<Recording | null>;
      deleteRecording: (id: string) => Promise<boolean>;
      updateRecordingTitle: (id: string, title: string) => Promise<void>;
      updateRecordingSummary: (id: string, summary: string) => Promise<void>;
      getAudioFilePath: (recordingId: string) => Promise<string | null>;
      showAudioInFolder: (recordingId: string) => Promise<boolean>;

      // Settings
      getSettings: () => Promise<Settings>;
      saveSettings: (settings: Partial<Settings>) => Promise<boolean>;
      savePrompt: (promptSettings: {
        summaryPrompt: string;
      }) => Promise<boolean>;
      savePrompts: (prompts: PromptTemplate[]) => Promise<boolean>;

      // Auto-Update
      installUpdate: () => Promise<void>;
      quitAndInstall: () => Promise<void>;

      // Audio Streaming (fire-and-forget)
      sendMicrophoneAudio: (data: ArrayBuffer) => void;
      sendSystemAudio: (data: ArrayBuffer) => void;

      // Event Listeners (main → renderer)
      onSummary: (
        callback: (data: { text: string; recordingId: string }) => void
      ) => void;
      onSummarizationStarted: (callback: () => void) => void;
      onSummarizationCompleted: (callback: () => void) => void;
      onDictationStatus: (callback: (isDictating: boolean) => void) => void;
      onStartAudioCapture: (callback: () => void) => void;
      onStopAudioCapture: (callback: () => void) => void;
      onResetAudioProcessing: (callback: () => void) => void;

      // Update Events
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
      onDownloadProgress: (
        callback: (progress: DownloadProgress) => void
      ) => void;
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
      onUpdateError: (callback: (error: string) => void) => void;
      onUpdateReadyToInstall: (callback: (info: UpdateInfo) => void) => void;

      // Dictation Status Window
      onDictationStatusUpdate: (
        callback: (isDictating: boolean) => void
      ) => void;

      // Cleanup
      removeAllListeners: (channel: string) => void;
    };

    logger: {
      info: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      debug: (...args: unknown[]) => void;
    };

    stateAPI: StateAPI;
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
