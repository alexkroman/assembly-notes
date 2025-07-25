import { jest } from '@jest/globals';

export const startTranscription = jest.fn().mockResolvedValue(false);
export const stopTranscription = jest.fn().mockResolvedValue(true);
export const sendMicrophoneAudio = jest.fn();
export const sendSystemAudio = jest.fn();
export const resetAai = jest.fn();

export default {
  startTranscription,
  stopTranscription,
  sendMicrophoneAudio,
  sendSystemAudio,
  resetAai,
};
