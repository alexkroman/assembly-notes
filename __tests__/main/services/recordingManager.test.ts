import 'reflect-metadata';
import { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { RecordingManager } from '../../../src/main/services/recordingManager';
import { resetTestContainer } from '../../test-helpers/container-setup';

// Create default state
const defaultState = {
  recording: {
    status: 'idle',
    recordingId: null,
    startTime: null,
    error: null,
    connectionStatus: { microphone: false, system: false },
  },
  recordings: {
    currentRecording: {
      id: 'test-recording-id',
      title: 'Test Recording',
      transcript: '',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  },
  transcription: {
    currentTranscript: 'Test transcript content',
    isTranscribing: false,
  },
  settings: { assemblyaiKey: 'test-api-key' },
};

// Mock Redux store with minimal implementation
const mockStore = {
  getState: jest.fn(() => defaultState),
  dispatch: jest.fn(),
  subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
} as any;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockMainWindow = {
  webContents: { send: jest.fn() },
} as unknown as BrowserWindow;

const mockTranscriptionService = {
  createCombinedConnection: jest.fn(),
  createMicrophoneOnlyConnection: jest.fn(),
  sendAudio: jest.fn(),
  sendKeepAlive: jest.fn(),
  closeConnections: jest.fn(),
  closeTranscriber: jest.fn(),
  emitSpeechActivity: jest.fn(),
  emitDictationText: jest.fn(),
} as any;

const mockSummarizationService = {
  summarizeTranscript: jest.fn(),
} as any;

const mockRecordingDataService = {
  saveCurrentTranscription: jest.fn(),
  saveSummary: jest.fn(),
  updateAudioFilename: jest.fn(),
} as any;

describe('RecordingManager', () => {
  let recordingManager: RecordingManager;

  beforeEach(() => {
    // Reset the container and mocks
    resetTestContainer();
    jest.clearAllMocks();

    // Reset getState to return default state
    mockStore.getState.mockReturnValue(defaultState);

    // Setup mock store dispatch
    mockStore.dispatch.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          recordingId: 'test-recording-id',
        }),
    }));

    // Register all mocks before resolving
    container.register(DI_TOKENS.Store, {
      useValue: mockStore as unknown as Store,
    });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.MainWindow, { useValue: mockMainWindow });
    container.register(DI_TOKENS.RecordingDataService, {
      useValue: mockRecordingDataService,
    });
    container.register(DI_TOKENS.TranscriptionService, {
      useValue: mockTranscriptionService,
    });
    container.register(DI_TOKENS.SummarizationService, {
      useValue: mockSummarizationService,
    });
    // Add mock for AudioRecordingService
    container.register(DI_TOKENS.AudioRecordingService, {
      useValue: {
        startRecording: jest.fn(),
        stopRecording: jest.fn().mockResolvedValue('test-audio.wav'),
        appendAudioData: jest.fn(),
        getAudioFilePath: jest.fn().mockReturnValue('/path/to/audio.wav'),
        deleteAudioFile: jest.fn(),
        cleanup: jest.fn(),
      },
    });

    recordingManager = container.resolve(RecordingManager);
  });

  afterEach(() => {
    resetTestContainer();
  });

  describe('startTranscription', () => {
    it('should successfully start transcription', async () => {
      // Mock successful connection creation
      mockTranscriptionService.createCombinedConnection.mockResolvedValue({
        microphone: { id: 'mic-1' },
        system: null,
      });

      const result = await recordingManager.startTranscription();

      expect(result).toBe(true);
      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(
        mockTranscriptionService.createCombinedConnection
      ).toHaveBeenCalledWith(
        'test-api-key',
        expect.objectContaining({
          onTranscript: expect.any(Function),
          onError: expect.any(Function),
          onConnectionStatus: expect.any(Function),
        })
      );
    });

    it('should fail when no current recording exists', async () => {
      mockStore.getState.mockReturnValueOnce({
        recording: {
          status: 'idle',
          recordingId: null,
          startTime: null,
          error: null,
          connectionStatus: { microphone: false, system: false },
        },
        recordings: { currentRecording: null },
        transcription: {
          currentTranscript: 'Test transcript content',
          isTranscribing: false,
        },
        settings: { assemblyaiKey: 'test-api-key' },
      });

      const result = await recordingManager.startTranscription();

      expect(result).toBe(false);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload:
            'Starting transcription requires an active recording. Please create a new recording first.',
        })
      );
    });

    it('should fail when API key is missing', async () => {
      const stateWithNoApiKey = {
        recording: {
          status: 'idle',
          recordingId: null,
          startTime: null,
          error: null,
          connectionStatus: { microphone: false, system: false },
        },
        recordings: {
          currentRecording: {
            id: 'test-recording-id',
            title: 'Test Recording',
            transcript: '',
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        },
        transcription: {
          currentTranscript: 'Test transcript content',
          isTranscribing: false,
        },
        settings: { assemblyaiKey: '' },
      };

      // Return the same state for both calls to getState
      mockStore.getState.mockReturnValue(stateWithNoApiKey);

      const result = await recordingManager.startTranscription();

      expect(result).toBe(false);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload:
            'AssemblyAI API key is not configured. Please add it in settings.',
        })
      );
    });

    it('should handle transcription service errors', async () => {
      // Set up the state to pass the initial checks
      mockStore.getState.mockReturnValueOnce({
        recording: {
          status: 'idle',
          recordingId: null,
          startTime: null,
          error: null,
          connectionStatus: { microphone: false, system: false },
        },
        recordings: {
          currentRecording: {
            id: 'test-recording-id',
            title: 'Test Recording',
            transcript: '',
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        },
        transcription: {
          currentTranscript: 'Test transcript content',
          isTranscribing: false,
        },
        settings: { assemblyaiKey: 'test-api-key' },
      });

      mockTranscriptionService.createCombinedConnection.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await recordingManager.startTranscription();

      expect(result).toBe(false);
      // The error is now logged through ErrorLogger with a different format
      expect(mockLogger.error).toHaveBeenCalledWith(
        'System error occurred:',
        expect.objectContaining({
          message: 'Connection failed',
          code: 'UNKNOWN_ERROR',
        })
      );
    });
  });

  describe('stopTranscription', () => {
    it('should successfully stop transcription', async () => {
      // Mock existing connections
      const mockConnections = {
        microphone: { id: 'mic-1' },
        system: { id: 'sys-1' },
      };

      // Set up the connections in the recording manager
      (recordingManager as any).connections = mockConnections;

      const result = await recordingManager.stopTranscription();

      expect(result).toBe(true);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'stop-audio-capture'
      );
      expect(mockTranscriptionService.closeConnections).toHaveBeenCalledWith(
        mockConnections
      );
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should handle stop errors gracefully', async () => {
      // Set up connections so the method tries to close them
      const mockConnections = {
        microphone: { id: 'mic-1' },
        system: { id: 'sys-1' },
      };
      (recordingManager as any).connections = mockConnections;

      mockTranscriptionService.closeConnections.mockRejectedValue(
        new Error('Close failed')
      );

      const result = await recordingManager.stopTranscription();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to stop recording:',
        expect.any(Error)
      );
    });
  });

  describe('sendAudio', () => {
    it('should send microphone audio to transcription service', () => {
      const audioData = new ArrayBuffer(1024);
      const mockTranscriber = { id: 'mic-1' };
      (recordingManager as any).connections = { microphone: mockTranscriber };

      recordingManager.sendMicrophoneAudio(audioData);

      expect(mockTranscriptionService.sendAudio).toHaveBeenCalledWith(
        mockTranscriber,
        audioData
      );
    });

    it('should not send system audio separately (handled via combined stream)', () => {
      const audioData = new ArrayBuffer(1024);
      const mockTranscriber = { id: 'sys-1' };
      (recordingManager as any).connections = { system: mockTranscriber };

      recordingManager.sendSystemAudio(audioData);

      // System audio is now handled via combined stream, so sendAudio should not be called
      expect(mockTranscriptionService.sendAudio).not.toHaveBeenCalled();
    });

    it('should not send audio when no connection exists', () => {
      const audioData = new ArrayBuffer(1024);
      (recordingManager as any).connections = {
        microphone: null,
        system: null,
      };

      recordingManager.sendMicrophoneAudio(audioData);
      recordingManager.sendSystemAudio(audioData);

      expect(mockTranscriptionService.sendAudio).not.toHaveBeenCalled();
    });
  });

  describe('summarizeTranscript', () => {
    it('should return false when no transcript available', async () => {
      mockStore.getState.mockReturnValueOnce({
        recording: {
          status: 'idle',
          recordingId: null,
          startTime: null,
          error: null,
          connectionStatus: { microphone: false, system: false },
        },
        transcription: { currentTranscript: '', isTranscribing: false },
        recordings: { currentRecording: null },
        settings: { summaryPrompt: '', assemblyaiKey: '' },
      });

      const result = await recordingManager.summarizeTranscript();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No transcript available for summarization'
      );
    });

    it('should handle missing API key', async () => {
      mockStore.getState.mockReturnValueOnce({
        recording: {
          status: 'idle',
          recordingId: null,
          startTime: null,
          error: null,
          connectionStatus: { microphone: false, system: false },
        },
        transcription: {
          currentTranscript: 'Test transcript content',
          isTranscribing: false,
        },
        recordings: {
          currentRecording: {
            id: 'test-recording-id',
            title: 'Test Recording',
            transcript: '',
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        },
        settings: { assemblyaiKey: '', summaryPrompt: 'test' },
      });

      const result = await recordingManager.summarizeTranscript();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during summarization: AssemblyAI API key not available'
      );
    });
  });

  describe('cleanup', () => {
    it('should clear keep-alive interval', () => {
      const mockInterval = setInterval(() => {}, 1000);
      (recordingManager as any).keepAliveInterval = mockInterval;

      recordingManager.cleanup();

      expect((recordingManager as any).keepAliveInterval).toBeNull();
    });
  });
});
