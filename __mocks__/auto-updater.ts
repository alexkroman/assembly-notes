import { jest } from '@jest/globals';

export const initAutoUpdater = jest.fn();
export const checkForUpdatesAndNotify = jest.fn();
export const quitAndInstall = jest.fn();
export const startUpdateCheck = jest.fn();

export default {
  initAutoUpdater,
  checkForUpdatesAndNotify,
  quitAndInstall,
  startUpdateCheck,
};
