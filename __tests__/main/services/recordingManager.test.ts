import { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { RecordingManager } from '../../../src/main/services/recordingManager';

// Mock Redux store with minimal implementation
const mockStore = {
  getState: jest.fn(() => ({
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
  })),
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
  createConnections: jest.fn(),
  sendAudio: jest.fn(),
  sendKeepAlive: jest.fn(),
  closeConnections: jest.fn(),
  closeTranscriber: jest.fn(),
} as any;

const mockSummarizationService = {
  summarizeTranscript: jest.fn(),
} as any;

const mockRecordingDataService = {
  saveCurrentTranscription: jest.fn(),
  saveSummary: jest.fn(),
} as any;

describe('RecordingManager', () => {
  let recordingManager: RecordingManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock store dispatch
    mockStore.dispatch.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          recordingId: 'test-recording-id',
        }),
    }));

    // Register mocks in container
    container.register(DI_TOKENS.Store, {
      useValue: mockStore as unknown as Store,
    });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger as any });
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

    recordingManager = container.resolve(RecordingManager);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('startTranscription', () => {
    it('should successfully start transcription', async () => {
      // Mock successful connection creation
      mockTranscriptionService.createConnections.mockResolvedValue({
        microphone: { id: 'mic-1' },
        system: { id: 'sys-1' },
      });

      const result = await recordingManager.startTranscription();

      expect(result).toBe(true);
      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(mockTranscriptionService.createConnections).toHaveBeenCalledWith(
        'test-api-key',
        expect.objectContaining({
          onTranscript: expect.any(Function),
          onError: expect.any(Function),
          onConnectionStatus: expect.any(Function),
        })
      );
    });

    it('should fail when no current recording exists', async () => {
      mockStore.getState.mockReturnValue({
        ...mockStore.getState(),
        recordings: { currentRecording: null },
      });

      const result = await recordingManager.startTranscription();

      expect(result).toBe(false);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload:
            'No recording selected. Please create a new recording first.',
        })
      );
    });

    it('should fail when API key is missing', async () => {
      mockStore.getState.mockReturnValue({
        ...mockStore.getState(),
        recordings: {
          currentRecording: {
            id: 'test-recording-id',
            title: 'Test Recording',
            transcript: '',
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        },
        settings: { assemblyaiKey: '' },
      });

      const result = await recordingManager.startTranscription();

      expect(result).toBe(false);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: 'AssemblyAI API Key is not set. Please add it in settings.',
        })
      );
    });

    it('should handle transcription service errors', async () => {
      // Set up the state to pass the initial checks
      mockStore.getState.mockReturnValue({
        ...mockStore.getState(),
        recordings: {
          currentRecording: {
            id: 'test-recording-id',
            title: 'Test Recording',
            transcript: '',
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        },
        settings: { assemblyaiKey: 'test-api-key' },
      });

      mockTranscriptionService.createConnections.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await recordingManager.startTranscription();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start recording:',
        expect.any(Error)
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

    it('should send system audio to transcription service', () => {
      const audioData = new ArrayBuffer(1024);
      const mockTranscriber = { id: 'sys-1' };
      (recordingManager as any).connections = { system: mockTranscriber };

      recordingManager.sendSystemAudio(audioData);

      expect(mockTranscriptionService.sendAudio).toHaveBeenCalledWith(
        mockTranscriber,
        audioData
      );
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
      mockStore.getState.mockReturnValue({
        ...mockStore.getState(),
        transcription: { currentTranscript: '' },
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
      mockStore.getState.mockReturnValue({
        ...mockStore.getState(),
        transcription: { currentTranscript: 'Test transcript content' },
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
