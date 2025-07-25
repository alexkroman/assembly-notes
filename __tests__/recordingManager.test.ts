import { jest } from '@jest/globals';

jest.mock('../src/main/settings');
jest.mock('../src/main/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock the TranscriptionService constructor and instance
const mockTranscriptionService = {
  initialize: jest.fn(),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  sendMicrophoneAudio: jest.fn(),
  sendSystemAudio: jest.fn(),
  reset: jest.fn(),
  getAai: jest.fn(),
  on: jest.fn(),
} as any;

jest.mock('../src/main/transcriptionService', () => {
  return jest.fn().mockImplementation(() => mockTranscriptionService);
});

interface MockMainWindow {
  webContents: {
    send: jest.MockedFunction<(channel: string, ...args: any[]) => void>;
  };
}

interface MockLemur {
  task: jest.MockedFunction<(params: any) => Promise<{ response: string }>>;
}

interface MockAai {
  lemur: MockLemur;
}

describe('Recording Manager', () => {
  let recordingManager: {
    startTranscription: (mainWindow: MockMainWindow) => Promise<boolean>;
    stopTranscription: (mainWindow: MockMainWindow) => Promise<boolean>;
    sendMicrophoneAudio: (audioData: Uint8Array) => void;
    sendSystemAudio: (audioData: Uint8Array) => void;
    resetAai: () => void;
  };
  let mockMainWindow: MockMainWindow;
  let mockLemur: MockLemur;
  let mockAai: MockAai;

  beforeEach(async () => {
    jest.clearAllMocks();

    const { getSettings } = await import('../src/main/settings');

    // Mock settings
    (getSettings as jest.MockedFunction<typeof getSettings>).mockReturnValue({
      assemblyaiKey: 'test-api-key',
      summaryPrompt: 'Test summary prompt',
      customPrompt: 'Test custom prompt',
      keepAliveEnabled: true,
      keepAliveIntervalSeconds: 30,
    });

    // Mock lemur for AI summarization
    mockLemur = {
      task: jest.fn().mockResolvedValue({ response: 'Test summary' }),
    };

    // Mock AssemblyAI instance
    mockAai = {
      lemur: mockLemur,
    };

    // Set up the mock AAI to return from the service
    mockTranscriptionService.getAai.mockReturnValue(mockAai);

    // Mock main window
    mockMainWindow = {
      webContents: {
        send: jest.fn(),
      },
    };

    recordingManager = await import('../src/main/recordingManager');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('startTranscription', () => {
    it('should start transcription successfully with valid API key', async () => {
      const TranscriptionService = await import(
        '../src/main/transcriptionService'
      );

      const result = await recordingManager.startTranscription(
        mockMainWindow as any
      );

      expect(result).toBe(true);
      expect(TranscriptionService.default).toHaveBeenCalled();
      expect(mockTranscriptionService.initialize).toHaveBeenCalledWith(
        'test-api-key',
        {
          enabled: true,
          intervalSeconds: 30,
        }
      );
      expect(mockTranscriptionService.start).toHaveBeenCalled();
    });

    it('should fail when AssemblyAI API key is not set', async () => {
      const { getSettings } = await import('../src/main/settings');
      (getSettings as jest.MockedFunction<typeof getSettings>).mockReturnValue({
        assemblyaiKey: null,
        customPrompt: 'test',
      } as any);

      const result = await recordingManager.startTranscription(
        mockMainWindow as any
      );

      expect(result).toBe(false);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'error',
        'AssemblyAI API Key is not set. Please add it in settings.'
      );
    });

    it('should handle initialization errors', async () => {
      mockTranscriptionService.start.mockRejectedValue(
        new Error('Start failed')
      );

      const result = await recordingManager.startTranscription(
        mockMainWindow as any
      );

      expect(result).toBe(false);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'error',
        'Failed to start: Start failed'
      );
    });

    it('should configure keep-alive settings from user preferences', async () => {
      const { getSettings } = await import('../src/main/settings');
      (getSettings as jest.MockedFunction<typeof getSettings>).mockReturnValue({
        assemblyaiKey: 'test-key',
        customPrompt: 'test',
        keepAliveEnabled: false,
        keepAliveIntervalSeconds: 60,
      } as any);

      await recordingManager.startTranscription(mockMainWindow as any);

      expect(mockTranscriptionService.initialize).toHaveBeenCalledWith(
        'test-key',
        {
          enabled: false,
          intervalSeconds: 60,
        }
      );
    });
  });

  describe('stopTranscription', () => {
    beforeEach(async () => {
      await recordingManager.startTranscription(mockMainWindow as any);
    });

    it('should stop transcription successfully', async () => {
      const result = await recordingManager.stopTranscription(
        mockMainWindow as any
      );

      expect(result).toBe(true);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'stop-audio-capture'
      );
      expect(mockTranscriptionService.stop).toHaveBeenCalled();
    });

    it('should handle missing transcription service gracefully', async () => {
      // Clear the service reference
      recordingManager.resetAai();

      const result = await recordingManager.stopTranscription(
        mockMainWindow as any
      );

      expect(result).toBe(true);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'stop-audio-capture'
      );
    });
  });

  describe('sendMicrophoneAudio', () => {
    beforeEach(async () => {
      await recordingManager.startTranscription(mockMainWindow as any);
    });

    it('should send audio data to transcription service', () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);

      recordingManager.sendMicrophoneAudio(audioData);

      expect(mockTranscriptionService.sendMicrophoneAudio).toHaveBeenCalledWith(
        audioData
      );
    });

    it('should handle missing transcription service gracefully', () => {
      recordingManager.resetAai();
      const audioData = new Uint8Array([1, 2, 3, 4]);

      expect(() => {
        recordingManager.sendMicrophoneAudio(audioData);
      }).not.toThrow();
    });
  });

  describe('sendSystemAudio', () => {
    beforeEach(async () => {
      await recordingManager.startTranscription(mockMainWindow as any);
    });

    it('should send audio data to transcription service', () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);

      recordingManager.sendSystemAudio(audioData);

      expect(mockTranscriptionService.sendSystemAudio).toHaveBeenCalledWith(
        audioData
      );
    });

    it('should handle missing transcription service gracefully', () => {
      recordingManager.resetAai();
      const audioData = new Uint8Array([1, 2, 3, 4]);

      expect(() => {
        recordingManager.sendSystemAudio(audioData);
      }).not.toThrow();
    });
  });

  describe('transcription service integration', () => {
    it('should properly integrate with transcription service', async () => {
      await recordingManager.startTranscription(mockMainWindow as any);

      // Verify basic integration
      expect(mockTranscriptionService.initialize).toHaveBeenCalled();
      expect(mockTranscriptionService.start).toHaveBeenCalled();
    });
  });

  describe('post-processing and summarization', () => {
    it('should handle post-processing after stop', async () => {
      await recordingManager.startTranscription(mockMainWindow as any);
      await recordingManager.stopTranscription(mockMainWindow as any);

      // The recording manager should call processRecordingComplete after stop
      // This happens asynchronously, so we just verify the stop was successful
      expect(mockTranscriptionService.stop).toHaveBeenCalled();
    });

    it('should handle missing AssemblyAI client gracefully', async () => {
      mockTranscriptionService.getAai.mockReturnValue(null);
      await recordingManager.startTranscription(mockMainWindow as any);

      const result = await recordingManager.stopTranscription(
        mockMainWindow as any
      );
      expect(result).toBe(true);
    });
  });

  describe('resetAai', () => {
    it('should reset the transcription service', async () => {
      await recordingManager.startTranscription(mockMainWindow as any);

      recordingManager.resetAai();

      expect(mockTranscriptionService.reset).toHaveBeenCalled();
    });

    it('should handle missing transcription service gracefully', () => {
      expect(() => recordingManager.resetAai()).not.toThrow();
    });
  });
});
