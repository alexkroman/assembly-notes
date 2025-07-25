/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import {
  mockElectronAPI
} from '../../__mocks__/electron-api';
import {
  AudioContext,
  AudioWorkletNode,
  mockAudioContext,
  mockWorkletNode,
  mockMediaStreamSource
} from '../../__mocks__/audio-context';

declare global {
  interface Window {
    electronAPI: typeof mockElectronAPI;
    AudioProcessing: {
      startAudioProcessing: (
        micStream: MediaStream,
        systemStream: MediaStream | null
      ) => Promise<void>;
      stopAudioProcessing: () => void;
      setRecordingState: (recording: boolean) => void;
    };
  }

  var AudioContext: jest.MockedClass<typeof globalThis.AudioContext>;
  var AudioWorkletNode: jest.MockedClass<typeof globalThis.AudioWorkletNode>;
}


describe('AudioProcessing Module', () => {
  let AudioProcessing: Window['AudioProcessing'];

  beforeEach(async () => {
    // Set up global mocks
    global.AudioContext = AudioContext as any;
    global.AudioWorkletNode = AudioWorkletNode as any;

    // Mock window.electronAPI
    global.window.electronAPI = mockElectronAPI;

    // Clear all mocks
    jest.clearAllMocks();

    // Load the module
    await import('../../src/renderer/audio-processing');
    AudioProcessing = window.AudioProcessing;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startAudioProcessing', () => {
    it('should initialize microphone audio processing', async () => {
      const mockStream = { id: 'test-stream' } as MediaStream;

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
      const mockStream = { id: 'test-stream' } as MediaStream;
      await AudioProcessing.startAudioProcessing(mockStream, null);

      const audioData = new Int16Array([1, 2, 3]);
      mockWorkletNode.port.onmessage!({
        data: { type: 'audioData', data: audioData },
      });

      expect(window.electronAPI.sendMicrophoneAudio).toHaveBeenCalledWith(
        audioData
      );
    });

    it('should initialize system audio processing when provided', async () => {
      const mockMicStream = { id: 'mic-stream' } as MediaStream;
      const mockSystemStream = { id: 'system-stream' } as MediaStream;

      await AudioProcessing.startAudioProcessing(
        mockMicStream,
        mockSystemStream
      );

      expect(AudioContext).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledTimes(2);
    });

    it('should handle system audio data messages', async () => {
      const mockMicStream = { id: 'mic-stream' } as MediaStream;
      const mockSystemStream = { id: 'system-stream' } as MediaStream;

      await AudioProcessing.startAudioProcessing(
        mockMicStream,
        mockSystemStream
      );

      // Get the second worklet node (system audio)
      const systemWorkletNode = (AudioWorkletNode as any).mock.results[1]
        .value as MockAudioWorkletNode;
      const audioData = new Int16Array([4, 5, 6]);
      systemWorkletNode.port.onmessage!({
        data: { type: 'audioData', data: audioData },
      });

      expect(window.electronAPI.sendSystemAudio).toHaveBeenCalledWith(
        audioData
      );
    });
  });

  describe('stopAudioProcessing', () => {
    it('should clean up all audio resources', async () => {
      const mockStream = { id: 'test-stream' } as MediaStream;
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
      const mockStream = { id: 'test-stream' } as MediaStream;
      await AudioProcessing.startAudioProcessing(mockStream, null);

      AudioProcessing.setRecordingState(true);

      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'setRecording',
        value: true,
      });
    });

    it('should send recording state to both worklets when system audio exists', async () => {
      const mockMicStream = { id: 'mic-stream' } as MediaStream;
      const mockSystemStream = { id: 'system-stream' } as MediaStream;
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
