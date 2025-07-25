/**
 * @jest-environment jsdom
 */

// Mock AudioWorkletProcessor since it's not available in Node.js
global.AudioWorkletProcessor = class {
  constructor() {
    this.port = {
      onmessage: null,
      postMessage: jest.fn(),
    };
  }
};

global.registerProcessor = jest.fn();

describe('AudioProcessor', () => {
  let AudioProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module to get a fresh instance
    jest.resetModules();

    // Require the module after setting up mocks
    require('../src/renderer/audio-processor.js');

    // Get the AudioProcessor class from the registerProcessor call
    const registerProcessorCall = global.registerProcessor.mock.calls.find(
      (call) => call[0] === 'audio-processor'
    );
    AudioProcessor = registerProcessorCall[1];
  });

  describe('constructor', () => {
    it('should initialize with recording disabled', () => {
      const processor = new AudioProcessor();

      expect(processor.isRecording).toBe(false);
      expect(processor.port.onmessage).toBeDefined();
    });

    it('should set up message handler', () => {
      const processor = new AudioProcessor();

      expect(typeof processor.port.onmessage).toBe('function');
    });
  });

  describe('message handling', () => {
    it('should handle setRecording message', () => {
      const processor = new AudioProcessor();

      // Simulate receiving a message
      processor.port.onmessage({
        data: {
          type: 'setRecording',
          value: true,
        },
      });

      expect(processor.isRecording).toBe(true);
    });

    it('should ignore unknown message types', () => {
      const processor = new AudioProcessor();
      const initialRecordingState = processor.isRecording;

      // Simulate receiving an unknown message
      processor.port.onmessage({
        data: {
          type: 'unknownMessage',
          value: true,
        },
      });

      expect(processor.isRecording).toBe(initialRecordingState);
    });
  });

  describe('process', () => {
    let processor;

    beforeEach(() => {
      processor = new AudioProcessor();
    });

    it('should return true when not recording', () => {
      processor.isRecording = false;

      const result = processor.process([]);

      expect(result).toBe(true);
      expect(processor.port.postMessage).not.toHaveBeenCalled();
    });

    it('should return true when recording but no input', () => {
      processor.isRecording = true;

      const result = processor.process([]);

      expect(result).toBe(true);
      expect(processor.port.postMessage).not.toHaveBeenCalled();
    });

    it('should return true when recording but empty input', () => {
      processor.isRecording = true;

      const result = processor.process([[]]);

      expect(result).toBe(true);
      expect(processor.port.postMessage).not.toHaveBeenCalled();
    });

    it('should process audio data when recording', () => {
      processor.isRecording = true;

      // Create mock audio input (float32 samples)
      const mockInputData = new Float32Array([0.5, -0.5, 0.25, -0.25]);
      const mockInput = [mockInputData];
      const mockInputs = [mockInput];

      const result = processor.process(mockInputs);

      expect(result).toBe(true);
      expect(processor.port.postMessage).toHaveBeenCalledWith({
        type: 'audioData',
        data: expect.any(Array),
      });

      // Verify the data conversion
      const sentMessage = processor.port.postMessage.mock.calls[0][0];
      expect(sentMessage.data).toBeInstanceOf(Array);
      expect(sentMessage.data.length).toBeGreaterThan(0);
    });

    it('should clamp audio samples to valid range', () => {
      processor.isRecording = true;

      // Create input with values outside [-1, 1] range
      const mockInputData = new Float32Array([2.0, -2.0, 0.5]);
      const mockInput = [mockInputData];
      const mockInputs = [mockInput];

      processor.process(mockInputs);

      expect(processor.port.postMessage).toHaveBeenCalled();

      // The processing should succeed without errors
      const sentMessage = processor.port.postMessage.mock.calls[0][0];
      expect(sentMessage.type).toBe('audioData');
      expect(sentMessage.data).toBeInstanceOf(Array);
    });

    it('should handle empty audio input gracefully', () => {
      processor.isRecording = true;

      const mockInputData = new Float32Array([]);
      const mockInput = [mockInputData];
      const mockInputs = [mockInput];

      const result = processor.process(mockInputs);

      expect(result).toBe(true);
      expect(processor.port.postMessage).not.toHaveBeenCalled();
    });

    it('should handle undefined input channel', () => {
      processor.isRecording = true;

      const mockInput = [undefined];
      const mockInputs = [mockInput];

      const result = processor.process(mockInputs);

      expect(result).toBe(true);
      expect(processor.port.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('audio conversion', () => {
    it('should convert float32 to int16 correctly', () => {
      const processor = new AudioProcessor();
      processor.isRecording = true;

      // Test specific conversion values
      const testValues = [0.0, 0.5, -0.5, 1.0, -1.0];
      const mockInputData = new Float32Array(testValues);
      const mockInput = [mockInputData];
      const mockInputs = [mockInput];

      processor.process(mockInputs);

      expect(processor.port.postMessage).toHaveBeenCalled();

      const sentMessage = processor.port.postMessage.mock.calls[0][0];
      expect(sentMessage.data).toHaveLength(testValues.length * 2); // Int16 is 2 bytes
    });
  });

  describe('registerProcessor', () => {
    it('should register the audio-processor', () => {
      expect(global.registerProcessor).toHaveBeenCalledWith(
        'audio-processor',
        AudioProcessor
      );
    });
  });
});
