import { jest } from '@jest/globals';

export const mockTranscriber = {
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  sendAudio: jest.fn(),
  on: jest.fn(),
};

export const AssemblyAI = jest.fn().mockImplementation(() => ({
  realtime: {
    transcriber: jest.fn().mockReturnValue(mockTranscriber),
  },
}));
