import { jest } from '@jest/globals';

export const autoUpdater = {
  on: jest.fn(),
  checkForUpdatesAndNotify: jest.fn().mockResolvedValue(undefined),
  quitAndInstall: jest.fn(),
  downloadUpdate: jest.fn().mockResolvedValue(undefined),
  logger: null,
};
