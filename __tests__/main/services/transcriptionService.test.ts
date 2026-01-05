import 'reflect-metadata';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { TranscriptionService } from '../../../src/main/services/transcriptionService';
import {
  resetTestContainer,
  registerMock,
} from '../../test-helpers/container-setup';
import {
  createMockRealtimeTranscriber,
  createMockAssemblyAIClient,
  createMockAssemblyAIFactory,
  createMockTranscriptionCallbacks,
  type MockRealtimeTranscriber,
  type MockTranscriptionCallbacks,
} from '../../test-helpers/mock-factories';

// Mock assemblyai module
jest.mock('assemblyai');

describe('TranscriptionService', () => {
  let transcriptionService: TranscriptionService;
  let callbacks: MockTranscriptionCallbacks;
  let mockRealtimeTranscriber: MockRealtimeTranscriber;
  let mockAssemblyAIFactory: ReturnType<typeof createMockAssemblyAIFactory>;

  beforeEach(() => {
    // Reset the container and mocks
    resetTestContainer();
    jest.clearAllMocks();

    // Create mocks using factories
    mockRealtimeTranscriber = createMockRealtimeTranscriber();
    const mockAssemblyAIClient = createMockAssemblyAIClient(
      mockRealtimeTranscriber
    );
    mockAssemblyAIFactory = createMockAssemblyAIFactory(mockAssemblyAIClient);

    // Register mocks using the helper
    registerMock(DI_TOKENS.AssemblyAIFactory, mockAssemblyAIFactory);

    transcriptionService = container.resolve(TranscriptionService);
    callbacks = createMockTranscriptionCallbacks();
  });

  afterEach(() => {
    resetTestContainer();
  });

  describe('createCombinedConnection', () => {
    it('should create combined audio connection', async () => {
      const connections = await transcriptionService.createCombinedConnection(
        'test-api-key',
        callbacks
      );

      expect(mockAssemblyAIFactory.createClient).toHaveBeenCalledWith(
        'test-api-key'
      );
      expect(connections.microphone).toBe(mockRealtimeTranscriber);
      expect(connections.system).toBeNull();
    });

    it('should setup event listeners for transcription', async () => {
      await transcriptionService.createCombinedConnection(
        'test-api-key',
        callbacks
      );

      // Should have called on for turn events (new streaming API)
      expect(mockRealtimeTranscriber.on).toHaveBeenCalledWith(
        'turn',
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
      mockAssemblyAIFactory.createClient.mockRejectedValue(
        new Error('API key invalid')
      );

      await expect(
        transcriptionService.createCombinedConnection('invalid-key', callbacks)
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
