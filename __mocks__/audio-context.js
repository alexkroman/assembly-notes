import { jest } from '@jest/globals';
// Mock MediaStream and MediaStreamTrack
export const mockTrack = {
    stop: jest.fn(),
};
export const mockStream = {
    getTracks: jest.fn().mockReturnValue([mockTrack]),
};
// Mock audio nodes
export const mockDelayNode = {
    delayTime: {
        setValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
};
export const mockGainNode = {
    gain: {
        setValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
};
export const mockMediaStreamSource = {
    connect: jest.fn(),
    disconnect: jest.fn(),
};
export const mockMediaStreamDestination = {
    stream: mockStream,
};
export const mockWorkletNode = {
    port: {
        onmessage: null,
        postMessage: jest.fn(),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
};
export const mockAudioContext = {
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
    port;
    constructor() {
        this.port = {
            onmessage: null,
            postMessage: jest.fn(),
        };
    }
};
export const registerProcessor = jest.fn();
//# sourceMappingURL=audio-context.js.map