/**
 * Shared Mock Factories
 *
 * Centralized mock creation for commonly used test dependencies.
 * Reduces boilerplate across test files.
 */

import type { Store } from '@reduxjs/toolkit';

import type { TranscriptFileService } from '../../src/main/services/transcriptFileService';
import type { StateBroadcaster } from '../../src/main/state-broadcaster';
import type { AppDispatch, RootState } from '../../src/main/store/store';

// ============================================================================
// AssemblyAI Mocks
// ============================================================================

export interface MockRealtimeTranscriber {
  connect: jest.Mock;
  sendAudio: jest.Mock;
  close: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
}

export function createMockRealtimeTranscriber(): MockRealtimeTranscriber {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    sendAudio: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
  };
}

export interface MockAssemblyAIClient {
  streaming: {
    transcriber: jest.Mock;
  };
}

export function createMockAssemblyAIClient(
  transcriber: MockRealtimeTranscriber
): MockAssemblyAIClient {
  return {
    streaming: {
      transcriber: jest.fn().mockReturnValue(transcriber),
    },
  };
}

export interface MockAssemblyAIFactory {
  createClient: jest.Mock;
}

export function createMockAssemblyAIFactory(
  client: MockAssemblyAIClient
): MockAssemblyAIFactory {
  return {
    createClient: jest.fn().mockResolvedValue(client),
  };
}

export interface MockLLMGatewayService {
  chat: jest.Mock;
}

export function createMockLLMGatewayService(): MockLLMGatewayService {
  return {
    chat: jest.fn().mockResolvedValue('Mock summary response'),
  };
}

// ============================================================================
// Electron Mocks
// ============================================================================

export interface MockBrowserWindow {
  webContents: {
    send: jest.Mock;
  };
}

export function createMockBrowserWindow(): MockBrowserWindow {
  return {
    webContents: {
      send: jest.fn(),
    },
  };
}

// ============================================================================
// Logger Mock
// ============================================================================

export interface MockLogger {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
}

export function createMockLogger(): MockLogger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

// ============================================================================
// Redux Store Mock
// ============================================================================

export interface MockStore {
  getState: jest.Mock;
  dispatch: jest.Mock;
  subscribe: jest.Mock;
}

export function createMockStore(
  initialState?: Partial<RootState>
): MockStore & Store<RootState> & { dispatch: AppDispatch } {
  const defaultState = {
    recording: {
      status: 'idle' as const,
      recordingId: null,
      startTime: null,
      error: null,
      connectionStatus: { microphone: false, system: false },
      isDictating: false,
      isTransitioning: false,
    },
    transcription: {
      currentTranscript: '',
      segments: [],
      isTranscribing: false,
      isActive: false,
      microphoneTranscriptBuffer: '',
      systemAudioTranscriptBuffer: '',
      error: null,
    },
    settings: {
      assemblyaiKey: 'test-api-key',
      summaryPrompt: '',
      prompts: [],
      autoStart: false,
      loading: false,
      error: null,
      hasAssemblyAIKey: true,
      dictationStylingPrompt: '',
      microphoneGain: 1.0,
      systemAudioGain: 0.7,
    },
    recordings: {
      ids: [],
      entities: {},
      currentRecording: null,
      searchResults: [],
      searchQuery: '',
      loading: {
        fetchAll: false,
        search: false,
        fetchOne: false,
        update: false,
        delete: false,
      },
      error: null,
    },
    update: {
      checking: false,
      available: false,
      downloading: false,
      progress: 0,
      downloaded: false,
      error: null,
      updateInfo: null,
    },
    ...initialState,
  };

  const store = {
    getState: jest.fn(() => defaultState),
    dispatch: jest.fn().mockImplementation((action) => {
      // Handle async thunks
      if (typeof action === 'function') {
        return action(store.dispatch, store.getState, undefined);
      }
      return action;
    }),
    subscribe: jest.fn(() => jest.fn()),
    replaceReducer: jest.fn(),
    [Symbol.observable]: jest.fn(),
  };

  return store as unknown as MockStore &
    Store<RootState> & { dispatch: AppDispatch };
}

// ============================================================================
// Transcript File Service Mock
// ============================================================================

export function createMockTranscriptFileService(): jest.Mocked<TranscriptFileService> {
  return {
    ensureTranscriptsDirectory: jest.fn().mockResolvedValue(undefined),
    getTranscriptsDir: jest.fn(() => '/mock/transcripts'),
    generateFilename: jest.fn().mockReturnValue('2024-01-01_mock-title.md'),
    findUniqueFilename: jest.fn((filename: string) =>
      Promise.resolve(filename)
    ),
    saveTranscript: jest.fn().mockResolvedValue('mock-file.md'),
    loadTranscript: jest.fn().mockResolvedValue(null),
    getAllTranscripts: jest.fn().mockResolvedValue([]),
    getTranscriptById: jest.fn().mockResolvedValue(null),
    updateTranscript: jest.fn().mockResolvedValue(true),
    deleteTranscript: jest.fn().mockResolvedValue(true),
    searchTranscripts: jest.fn().mockResolvedValue([]),
    transcriptExists: jest.fn().mockResolvedValue(false),
  } as unknown as jest.Mocked<TranscriptFileService>;
}

// ============================================================================
// State Broadcaster Mock
// ============================================================================

export function createMockStateBroadcaster(): jest.Mocked<StateBroadcaster> {
  return {
    broadcast: jest.fn(),
    // Recording state
    recordingStatus: jest.fn(),
    recordingConnection: jest.fn(),
    recordingError: jest.fn(),
    recordingDictation: jest.fn(),
    recordingTransitioning: jest.fn(),
    recordingReset: jest.fn(),
    // Transcription state
    transcriptionSegment: jest.fn(),
    transcriptionBuffer: jest.fn(),
    transcriptionError: jest.fn(),
    transcriptionClear: jest.fn(),
    transcriptionLoad: jest.fn(),
    // Settings state
    settingsUpdated: jest.fn(),
    // Update state
    updateChecking: jest.fn(),
    updateAvailable: jest.fn(),
    updateNotAvailable: jest.fn(),
    updateDownloading: jest.fn(),
    updateProgress: jest.fn(),
    updateDownloaded: jest.fn(),
    updateError: jest.fn(),
    updateReset: jest.fn(),
    // Recordings state
    recordingsCurrent: jest.fn(),
    recordingsTitle: jest.fn(),
    recordingsSummary: jest.fn(),
    recordingsTranscript: jest.fn(),
  } as unknown as jest.Mocked<StateBroadcaster>;
}

// ============================================================================
// Transcription Callbacks Mock
// ============================================================================

export interface MockTranscriptionCallbacks {
  onTranscript: jest.Mock;
  onError: jest.Mock;
  onConnectionStatus: jest.Mock;
}

export function createMockTranscriptionCallbacks(): MockTranscriptionCallbacks {
  return {
    onTranscript: jest.fn(),
    onError: jest.fn(),
    onConnectionStatus: jest.fn(),
  };
}
