import { jest } from '@jest/globals';

export const mockTranscriptionService = {
  initialize: jest.fn(),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  sendMicrophoneAudio: jest.fn(),
  sendSystemAudio: jest.fn(),
  reset: jest.fn(),
  getAai: jest.fn(),
  on: jest.fn(),
};

export default jest.fn().mockImplementation(() => mockTranscriptionService);