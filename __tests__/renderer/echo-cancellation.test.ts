/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

import {
  AudioContext,
  MediaStream,
  mockAudioContext,
  mockStream,
  mockTrack,
  mockDelayNode,
  mockGainNode,
  mockMediaStreamSource,
  mockMediaStreamDestination,
} from '../../__mocks__/audio-context';

declare global {
  var MediaStream: jest.MockedClass<typeof globalThis.MediaStream>;
  var AudioContext: jest.MockedClass<typeof globalThis.AudioContext>;

  interface Window {
    AudioContext: typeof globalThis.AudioContext;
    webkitAudioContext?: typeof globalThis.AudioContext;
    EchoCancellation: {
      processEchoCancellation: (
        micStream: MediaStream,
        systemStream: MediaStream
      ) => MediaStream;
      cleanupEchoCancellation: () => void;
    };
  }
}

describe('EchoCancellation Module', () => {
  let EchoCancellation: Window['EchoCancellation'];

  beforeEach(async () => {
    // Set up global mocks
    global.MediaStream = MediaStream as any;
    global.AudioContext = AudioContext as any;
    global.window.AudioContext = global.AudioContext;
    global.window.webkitAudioContext = undefined;

    // Clear all mocks
    jest.clearAllMocks();

    // Reset modules
    jest.resetModules();

    // Load the module
    await import('../../src/renderer/echo-cancellation');
    EchoCancellation = window.EchoCancellation;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEchoCancellation', () => {
    it('should create AudioContext on first call', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(global.AudioContext).toHaveBeenCalledTimes(1);
      expect(
        mockAudioContext.createMediaStreamDestination
      ).toHaveBeenCalledTimes(1);
    });

    it('should reuse existing AudioContext on subsequent calls', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      // First call
      EchoCancellation.processEchoCancellation(micStream, systemStream);
      expect(global.AudioContext).toHaveBeenCalledTimes(1);

      // Second call
      EchoCancellation.processEchoCancellation(micStream, systemStream);
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('should create media stream sources for both streams', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(
        micStream
      );
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(
        systemStream
      );
    });

    it('should create and configure delay node', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(mockAudioContext.createDelay).toHaveBeenCalledWith(1.0);
      expect(mockDelayNode.delayTime.setValueAtTime).toHaveBeenCalledWith(
        0.1,
        0
      );
    });

    it('should create three gain nodes with correct values', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);

      // Verify gain values
      const gainCalls = mockGainNode.gain.setValueAtTime.mock.calls;
      expect(gainCalls).toContainEqual([1.0, 0]); // micGain
      expect(gainCalls).toContainEqual([0.8, 0]); // systemGain
      expect(gainCalls).toContainEqual([-0.5, 0]); // echoGain
    });

    it('should connect nodes correctly', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      // Verify connections
      expect(mockMediaStreamSource.connect).toHaveBeenCalled();
      expect(mockDelayNode.connect).toHaveBeenCalled();
      expect(mockGainNode.connect).toHaveBeenCalled();
    });

    it('should return echo cancelled stream', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      const result = EchoCancellation.processEchoCancellation(
        micStream,
        systemStream
      );

      expect(result).toBe(mockStream);
    });

    it('should use webkitAudioContext if AudioContext is not available', async () => {
      global.AudioContext = undefined as any;
      global.window.AudioContext = undefined as any;
      global.window.webkitAudioContext = jest
        .fn()
        .mockImplementation(() => mockAudioContext) as any;

      // Reset modules to reload with new mocks
      jest.resetModules();
      await import('../../src/renderer/echo-cancellation');
      EchoCancellation = window.EchoCancellation;

      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(global.window.webkitAudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupEchoCancellation', () => {
    it('should disconnect and clean up all resources', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      // Setup echo cancellation first
      EchoCancellation.processEchoCancellation(micStream, systemStream);

      // Clean up
      EchoCancellation.cleanupEchoCancellation();

      // Verify disconnections
      expect(mockMediaStreamSource.disconnect).toHaveBeenCalledTimes(2);

      // Verify audio context closed
      expect(mockAudioContext.close).toHaveBeenCalledTimes(1);

      // Verify stream tracks stopped
      expect(mockTrack.stop).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup when nothing is initialized', () => {
      // Should not throw when cleaning up without initialization
      expect(() => {
        EchoCancellation.cleanupEchoCancellation();
      }).not.toThrow();
    });

    it('should handle multiple cleanup calls gracefully', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      // Setup echo cancellation
      EchoCancellation.processEchoCancellation(micStream, systemStream);

      // First cleanup
      EchoCancellation.cleanupEchoCancellation();

      // Second cleanup should not throw
      expect(() => {
        EchoCancellation.cleanupEchoCancellation();
      }).not.toThrow();

      // Verify cleanup methods were only called once
      expect(mockMediaStreamSource.disconnect).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.close).toHaveBeenCalledTimes(1);
      expect(mockTrack.stop).toHaveBeenCalledTimes(1);
    });

    it('should clear all references after cleanup', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      // Setup echo cancellation
      EchoCancellation.processEchoCancellation(micStream, systemStream);

      // Clean up
      EchoCancellation.cleanupEchoCancellation();

      // Process again should create new context
      EchoCancellation.processEchoCancellation(micStream, systemStream);

      // AudioContext should be created twice (once before cleanup, once after)
      expect(global.AudioContext).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple stream tracks during cleanup', () => {
      const mockTrack1 = { stop: jest.fn() };
      const mockTrack2 = { stop: jest.fn() };
      const mockTrack3 = { stop: jest.fn() };

      mockStream.getTracks.mockReturnValue([
        mockTrack1,
        mockTrack2,
        mockTrack3,
      ]);

      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);
      EchoCancellation.cleanupEchoCancellation();

      expect(mockTrack1.stop).toHaveBeenCalledTimes(1);
      expect(mockTrack2.stop).toHaveBeenCalledTimes(1);
      expect(mockTrack3.stop).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in AudioContext creation gracefully', async () => {
      global.AudioContext = undefined as any;
      global.window.AudioContext = undefined as any;
      global.window.webkitAudioContext = jest.fn().mockImplementation(() => {
        throw new Error('Audio context not supported');
      }) as any;

      // Reset modules to reload with new mocks
      jest.resetModules();
      await import('../../src/renderer/echo-cancellation');
      EchoCancellation = window.EchoCancellation;

      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      expect(() => {
        EchoCancellation.processEchoCancellation(micStream, systemStream);
      }).toThrow('Audio context not supported');
    });
  });

  describe('module structure', () => {
    it('should expose only the public API', () => {
      expect(EchoCancellation).toBeDefined();
      expect(typeof EchoCancellation.processEchoCancellation).toBe('function');
      expect(typeof EchoCancellation.cleanupEchoCancellation).toBe('function');
      expect(Object.keys(EchoCancellation)).toEqual([
        'processEchoCancellation',
        'cleanupEchoCancellation',
      ]);
    });
  });
});
