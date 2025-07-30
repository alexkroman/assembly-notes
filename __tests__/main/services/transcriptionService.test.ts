import { RealtimeTranscriber } from 'assemblyai';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import {
  IAssemblyAIClient,
  IAssemblyAIFactory,
  TranscriptionCallbacks,
  TranscriptionService,
} from '../../../src/main/services/transcriptionService';

// Mock RealtimeTranscriber
const mockRealtimeTranscriber = {
  connect: jest.fn(),
  sendAudio: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as unknown as jest.Mocked<RealtimeTranscriber>;

// Mock AssemblyAI client
const mockAssemblyAIClient: IAssemblyAIClient = {
  realtime: {
    transcriber: jest.fn(() => mockRealtimeTranscriber),
  },
};

// Mock AssemblyAI factory
const mockAssemblyAIFactory = {
  createClient: jest.fn(() => Promise.resolve(mockAssemblyAIClient)),
} as unknown as jest.Mocked<IAssemblyAIFactory>;

describe('TranscriptionService', () => {
  let transcriptionService: TranscriptionService;
  let callbacks: TranscriptionCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();

    // Register mocks in container
    container.register(DI_TOKENS.AssemblyAIFactory, {
      useValue: mockAssemblyAIFactory,
    });

    transcriptionService = container.resolve(TranscriptionService);

    callbacks = {
      onTranscript: jest.fn(),
      onError: jest.fn(),
      onConnectionStatus: jest.fn(),
    };

    // Reset sendAudio mock to default implementation
    mockRealtimeTranscriber.sendAudio.mockReset();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('createConnections', () => {
    it('should create connections for both microphone and system audio', async () => {
      const connections = await transcriptionService.createConnections(
        'test-api-key',
        callbacks
      );

      expect(mockAssemblyAIFactory.createClient).toHaveBeenCalledWith(
        'test-api-key'
      );
      expect(connections.microphone).toBe(mockRealtimeTranscriber);
      expect(connections.system).toBe(mockRealtimeTranscriber);
    });

    it('should setup event listeners for transcription', async () => {
      await transcriptionService.createConnections('test-api-key', callbacks);

      // Should have called on for transcript events
      expect(mockRealtimeTranscriber.on).toHaveBeenCalledWith(
        'transcript',
        expect.any(Function)
      );
      expect(mockRealtimeTranscriber.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(mockRealtimeTranscriber.on).toHaveBeenCalledWith(
        'open',
        expect.any(Function)
      );
      expect(mockRealtimeTranscriber.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      );
    });

    it('should handle factory errors gracefully', async () => {
      mockAssemblyAIFactory.createClient.mockImplementation(() => {
        throw new Error('API key invalid');
      });

      await expect(
        transcriptionService.createConnections('invalid-key', callbacks)
      ).rejects.toThrow('API key invalid');
    });
  });

  describe('closeConnections', () => {
    it('should close both connections', async () => {
      const connections = {
        microphone: mockRealtimeTranscriber as any,
        system: mockRealtimeTranscriber as any,
      };

      await transcriptionService.closeConnections(connections);

      expect(mockRealtimeTranscriber.close).toHaveBeenCalledTimes(2);
    });

    it('should handle null connections gracefully', async () => {
      const connections = {
        microphone: null as any,
        system: null as any,
      };

      await expect(
        transcriptionService.closeConnections(connections)
      ).resolves.not.toThrow();
    });
  });

  describe('sendAudio', () => {
    it('should send audio data to transcriber', () => {
      const audioData = new ArrayBuffer(1024);

      transcriptionService.sendAudio(mockRealtimeTranscriber as any, audioData);

      expect(mockRealtimeTranscriber.sendAudio).toHaveBeenCalledWith(
        expect.any(ArrayBuffer)
      );
    });

    it('should handle null transcriber gracefully', () => {
      const audioData = new ArrayBuffer(1024);

      expect(() =>
        transcriptionService.sendAudio(null, audioData)
      ).not.toThrow();
    });

    it('should handle sendAudio errors gracefully', () => {
      const audioData = new ArrayBuffer(1024);
      mockRealtimeTranscriber.sendAudio.mockImplementation(() => {
        throw new Error('Socket is not open');
      });

      expect(() =>
        transcriptionService.sendAudio(
          mockRealtimeTranscriber as any,
          audioData
        )
      ).not.toThrow();
    });
  });

  describe('sendKeepAlive', () => {
    beforeEach(() => {
      // Reset the sendAudio mock specifically for this test
      mockRealtimeTranscriber.sendAudio.mockClear();
    });

    it('should send keep alive message to transcriber', () => {
      transcriptionService.sendKeepAlive(mockRealtimeTranscriber as any);

      expect(mockRealtimeTranscriber.sendAudio).toHaveBeenCalledTimes(1);

      // Check that sendAudio was called with some data
      const callArgs = mockRealtimeTranscriber.sendAudio.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs![0]).toBeDefined();
    });

    it('should handle null transcriber gracefully', () => {
      expect(() => transcriptionService.sendKeepAlive(null)).not.toThrow();
    });
  });

  describe('closeTranscriber', () => {
    it('should close transcriber connection', async () => {
      await transcriptionService.closeTranscriber(
        mockRealtimeTranscriber as any
      );

      expect(mockRealtimeTranscriber.close).toHaveBeenCalled();
    });

    it('should handle null transcriber gracefully', async () => {
      await expect(
        transcriptionService.closeTranscriber(null)
      ).resolves.not.toThrow();
    });

    it('should handle close errors gracefully', async () => {
      mockRealtimeTranscriber.close.mockRejectedValue(
        new Error('Connection error')
      );

      await expect(
        transcriptionService.closeTranscriber(mockRealtimeTranscriber as any)
      ).resolves.not.toThrow();
    });
  });
});
