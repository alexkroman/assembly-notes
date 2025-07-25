import { jest } from '@jest/globals';

interface MockTrack {
  stop: jest.MockedFunction<() => void>;
}

interface MockStream {
  getTracks: jest.MockedFunction<() => MockTrack[]>;
}

interface MockDelayNode {
  delayTime: {
    setValueAtTime: jest.MockedFunction<(value: number, time: number) => void>;
  };
  connect: jest.MockedFunction<(destination: any) => void>;
}

interface MockGainNode {
  gain: {
    setValueAtTime: jest.MockedFunction<(value: number, time: number) => void>;
  };
  connect: jest.MockedFunction<(destination: any) => void>;
}

interface MockMediaStreamSource {
  connect: jest.MockedFunction<(destination: any) => void>;
  disconnect: jest.MockedFunction<() => void>;
}

interface MockMediaStreamDestination {
  stream: MockStream;
}

interface MockAudioWorkletNode {
  port: {
    onmessage:
      | ((event: { data: { type: string; data: Int16Array } }) => void)
      | null;
    postMessage: jest.MockedFunction<(message: any) => void>;
  };
  connect: jest.MockedFunction<(destination: any) => void>;
  disconnect: jest.MockedFunction<() => void>;
}

interface MockAudioContext {
  sampleRate: number;
  currentTime: number;
  destination: any;
  audioWorklet: {
    addModule: jest.MockedFunction<(url: string) => Promise<void>>;
  };
  createMediaStreamSource: jest.MockedFunction<
    (stream: MediaStream) => MockMediaStreamSource
  >;
  createMediaStreamDestination: jest.MockedFunction<
    () => MockMediaStreamDestination
  >;
  createDelay: jest.MockedFunction<(maxDelay: number) => MockDelayNode>;
  createGain: jest.MockedFunction<() => MockGainNode>;
  close: jest.MockedFunction<() => Promise<void>>;
}

// Mock MediaStream and MediaStreamTrack
export const mockTrack: MockTrack = {
  stop: jest.fn(),
};

export const mockStream: MockStream = {
  getTracks: jest.fn().mockReturnValue([mockTrack]),
};

// Mock audio nodes
export const mockDelayNode: MockDelayNode = {
  delayTime: {
    setValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
};

export const mockGainNode: MockGainNode = {
  gain: {
    setValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
};

export const mockMediaStreamSource: MockMediaStreamSource = {
  connect: jest.fn(),
  disconnect: jest.fn(),
};

export const mockMediaStreamDestination: MockMediaStreamDestination = {
  stream: mockStream,
};

export const mockWorkletNode: MockAudioWorkletNode = {
  port: {
    onmessage: null,
    postMessage: jest.fn(),
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
};

export const mockAudioContext: MockAudioContext = {
  sampleRate: 16000,
  currentTime: 0,
  destination: {},
  audioWorklet: {
    addModule: jest.fn().mockResolvedValue(undefined),
  },
  createMediaStreamSource: jest.fn().mockReturnValue(mockMediaStreamSource),
  createMediaStreamDestination: jest
    .fn()
    .mockReturnValue(mockMediaStreamDestination),
  createDelay: jest.fn().mockReturnValue(mockDelayNode),
  createGain: jest.fn().mockReturnValue(mockGainNode),
  close: jest.fn().mockResolvedValue(undefined),
};

// Mock constructors
export const AudioContext = jest
  .fn()
  .mockImplementation(() => mockAudioContext);
export const AudioWorkletNode = jest
  .fn()
  .mockImplementation(() => mockWorkletNode);
export const MediaStream = jest.fn().mockImplementation(() => ({}));

// Mock AudioWorkletProcessor for Node.js environment
export const AudioWorkletProcessor = class {
  port: MockAudioWorkletNode['port'];

  constructor() {
    this.port = {
      onmessage: null,
      postMessage: jest.fn(),
    };
  }
};

export const registerProcessor = jest.fn();
