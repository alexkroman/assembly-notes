/**
 * Shared Mock Factories
 *
 * Centralized mock creation for commonly used test dependencies.
 * Reduces boilerplate across test files.
 */

import type { Store } from '@reduxjs/toolkit';

import type { DatabaseService } from '../../src/main/database';
import type { StateBroadcaster } from '../../src/main/state-broadcaster';
import type { AppDispatch, RootState } from '../../src/main/store/store';
import type { SettingsSchema } from '../../src/types/common';

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

export interface MockLemurClient {
  task: jest.Mock;
}

export function createMockLemurClient(): MockLemurClient {
  return {
    task: jest.fn().mockResolvedValue({
      response: 'Mock summary response',
    }),
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
      dictationStylingEnabled: false,
      dictationStylingPrompt: '',
      dictationSilenceTimeout: 2000,
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
// Database Service Mock
// ============================================================================

export function createMockDatabaseService(
  settings?: Partial<SettingsSchema>
): jest.Mocked<DatabaseService> {
  const defaultSettings: SettingsSchema = {
    assemblyaiKey: 'test-key',
    summaryPrompt: 'Summarize:',
    prompts: [],
    autoStart: false,
    dictationStylingEnabled: false,
    dictationStylingPrompt: '',
    dictationSilenceTimeout: 2000,
    ...settings,
  };

  return {
    getSettings: jest.fn(() => defaultSettings),
    setSetting: jest.fn(),
    getRecordingById: jest.fn(),
    getAllRecordings: jest.fn(() => []),
    searchRecordings: jest.fn(() => []),
    createRecording: jest.fn(),
    updateRecording: jest.fn(),
    deleteRecording: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
}

// ============================================================================
// State Broadcaster Mock
// ============================================================================

export function createMockStateBroadcaster(): jest.Mocked<StateBroadcaster> {
  return {
    settingsUpdated: jest.fn(),
    recordingStarted: jest.fn(),
    recordingStopped: jest.fn(),
    recordingError: jest.fn(),
    recordingConnection: jest.fn(),
    transcriptionSegment: jest.fn(),
    transcriptionBuffer: jest.fn(),
    transcriptionUpdated: jest.fn(),
    recordingUpdated: jest.fn(),
    recordingsListUpdated: jest.fn(),
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
