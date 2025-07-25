/**
 * @jest-environment jsdom
 */

describe('AudioProcessing Module', () => {
  let AudioProcessing;
  let mockAudioContext;
  let mockWorkletNode;
  let mockMediaStreamSource;

  beforeEach(() => {
    // Mock AudioContext
    mockWorkletNode = {
      port: {
        onmessage: null,
        postMessage: jest.fn(),
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    mockMediaStreamSource = {
      connect: jest.fn(),
    };

    mockAudioContext = {
      sampleRate: 16000,
      destination: {},
      audioWorklet: {
        addModule: jest.fn().mockResolvedValue(),
      },
      createMediaStreamSource: jest.fn().mockReturnValue(mockMediaStreamSource),
      close: jest.fn().mockResolvedValue(),
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    global.AudioWorkletNode = jest
      .fn()
      .mockImplementation(() => mockWorkletNode);

    // Mock window.electronAPI
    global.window.electronAPI = {
      sendMicrophoneAudio: jest.fn(),
      sendSystemAudio: jest.fn(),
    };

    // Load the module
    require('../src/renderer/audio-processing.js');
    AudioProcessing = window.AudioProcessing;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startAudioProcessing', () => {
    it('should initialize microphone audio processing', async () => {
      const mockStream = { id: 'test-stream' };

      await AudioProcessing.startAudioProcessing(mockStream, null);

      expect(AudioContext).toHaveBeenCalledWith({ sampleRate: 16000 });
      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledWith(
        './audio-processor.js'
      );
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(
        mockStream
      );
      expect(mockMediaStreamSource.connect).toHaveBeenCalledWith(
        mockWorkletNode
      );
      expect(mockWorkletNode.connect).toHaveBeenCalledWith(
        mockAudioContext.destination
      );
    });

    it('should handle microphone audio data messages', async () => {
      const mockStream = { id: 'test-stream' };
      await AudioProcessing.startAudioProcessing(mockStream, null);

      const audioData = new Int16Array([1, 2, 3]);
      mockWorkletNode.port.onmessage({
        data: { type: 'audioData', data: audioData },
      });

      expect(window.electronAPI.sendMicrophoneAudio).toHaveBeenCalledWith(
        audioData
      );
    });

    it('should initialize system audio processing when provided', async () => {
      const mockMicStream = { id: 'mic-stream' };
      const mockSystemStream = { id: 'system-stream' };

      await AudioProcessing.startAudioProcessing(
        mockMicStream,
        mockSystemStream
      );

      expect(AudioContext).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledTimes(2);
    });

    it('should handle system audio data messages', async () => {
      const mockMicStream = { id: 'mic-stream' };
      const mockSystemStream = { id: 'system-stream' };

      await AudioProcessing.startAudioProcessing(
        mockMicStream,
        mockSystemStream
      );

      // Get the second worklet node (system audio)
      const systemWorkletNode = AudioWorkletNode.mock.results[1].value;
      const audioData = new Int16Array([4, 5, 6]);
      systemWorkletNode.port.onmessage({
        data: { type: 'audioData', data: audioData },
      });

      expect(window.electronAPI.sendSystemAudio).toHaveBeenCalledWith(
        audioData
      );
    });
  });

  describe('stopAudioProcessing', () => {
    it('should clean up all audio resources', async () => {
      const mockStream = { id: 'test-stream' };
      await AudioProcessing.startAudioProcessing(mockStream, mockStream);

      AudioProcessing.stopAudioProcessing();

      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'setRecording',
        value: false,
      });
      expect(mockWorkletNode.disconnect).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle stopping when not started', () => {
      expect(() => AudioProcessing.stopAudioProcessing()).not.toThrow();
    });
  });

  describe('setRecordingState', () => {
    it('should send recording state to microphone worklet', async () => {
      const mockStream = { id: 'test-stream' };
      await AudioProcessing.startAudioProcessing(mockStream, null);

      AudioProcessing.setRecordingState(true);

      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'setRecording',
        value: true,
      });
    });

    it('should send recording state to both worklets when system audio exists', async () => {
      const mockMicStream = { id: 'mic-stream' };
      const mockSystemStream = { id: 'system-stream' };
      await AudioProcessing.startAudioProcessing(
        mockMicStream,
        mockSystemStream
      );

      AudioProcessing.setRecordingState(false);

      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledTimes(2);
      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'setRecording',
        value: false,
      });
    });

    it('should handle setting state when not initialized', () => {
      expect(() => AudioProcessing.setRecordingState(true)).not.toThrow();
    });
  });
});
