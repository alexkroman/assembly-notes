/**
 * @jest-environment jsdom
 */

describe('EchoCancellation Module', () => {
  let EchoCancellation;
  let mockAudioContext;
  let mockMediaStreamDestination;
  let mockMediaStreamSource;
  let mockDelayNode;
  let mockGainNode;
  let mockStream;
  let mockTrack;

  beforeEach(() => {
    // Mock MediaStream constructor
    global.MediaStream = jest.fn().mockImplementation(() => ({}));

    // Mock MediaStream and MediaStreamTrack
    mockTrack = {
      stop: jest.fn(),
    };

    mockStream = {
      getTracks: jest.fn().mockReturnValue([mockTrack]),
    };

    // Mock audio nodes
    mockDelayNode = {
      delayTime: {
        setValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };

    mockGainNode = {
      gain: {
        setValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };

    mockMediaStreamSource = {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    mockMediaStreamDestination = {
      stream: mockStream,
    };

    // Mock AudioContext
    mockAudioContext = {
      currentTime: 0,
      createMediaStreamDestination: jest.fn().mockReturnValue(mockMediaStreamDestination),
      createMediaStreamSource: jest.fn().mockReturnValue(mockMediaStreamSource),
      createDelay: jest.fn().mockReturnValue(mockDelayNode),
      createGain: jest.fn().mockReturnValue(mockGainNode),
      close: jest.fn().mockResolvedValue(),
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    global.window.AudioContext = global.AudioContext;
    global.window.webkitAudioContext = undefined;

    // Load the module
    jest.isolateModules(() => {
      require('../src/renderer/echo-cancellation.js');
    });
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
      expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalledTimes(1);
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
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(micStream);
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(systemStream);
    });

    it('should create and configure delay node', () => {
      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(mockAudioContext.createDelay).toHaveBeenCalledWith(1.0);
      expect(mockDelayNode.delayTime.setValueAtTime).toHaveBeenCalledWith(0.1, 0);
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

      const result = EchoCancellation.processEchoCancellation(micStream, systemStream);

      expect(result).toBe(mockStream);
    });

    it('should use webkitAudioContext if AudioContext is not available', () => {
      global.AudioContext = undefined;
      global.window.AudioContext = undefined;
      global.window.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

      jest.isolateModules(() => {
        require('../src/renderer/echo-cancellation.js');
      });
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

      mockStream.getTracks.mockReturnValue([mockTrack1, mockTrack2, mockTrack3]);

      const micStream = new MediaStream();
      const systemStream = new MediaStream();

      EchoCancellation.processEchoCancellation(micStream, systemStream);
      EchoCancellation.cleanupEchoCancellation();

      expect(mockTrack1.stop).toHaveBeenCalledTimes(1);
      expect(mockTrack2.stop).toHaveBeenCalledTimes(1);
      expect(mockTrack3.stop).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in AudioContext creation gracefully', () => {
      global.AudioContext = undefined;
      global.window.AudioContext = undefined;
      global.window.webkitAudioContext = jest.fn().mockImplementation(() => {
        throw new Error('Audio context not supported');
      });

      jest.isolateModules(() => {
        require('../src/renderer/echo-cancellation.js');
      });
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
      expect(Object.keys(EchoCancellation)).toEqual(['processEchoCancellation', 'cleanupEchoCancellation']);
    });
  });
});