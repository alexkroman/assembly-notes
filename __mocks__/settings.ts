import { jest } from '@jest/globals';

export const loadSettings = jest.fn();
export const saveSettingsToFile = jest.fn();
export const getSettings = jest.fn().mockReturnValue({
  assemblyaiKey: '',
  customPrompt: '',
  keepAliveEnabled: true,
  keepAliveIntervalSeconds: 30,
  summaryPrompt: '',
});