import { jest } from '@jest/globals';

export const app = {
  getPath: jest.fn((name: string) => `/mock/path/${name}`),
  getName: jest.fn(() => 'assembly-notes'),
  on: jest.fn(),
  whenReady: jest.fn(() => Promise.resolve()),
  quit: jest.fn(),
};

export const ipcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  on: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
  },
}));

export const dialog = {
  showErrorBox: jest.fn(),
  showMessageBox: jest.fn(),
};

export default {
  app,
  ipcMain,
  BrowserWindow,
  dialog,
};
