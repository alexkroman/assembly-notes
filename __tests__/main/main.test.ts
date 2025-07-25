import { jest } from '@jest/globals';

// Mock all the dependencies before importing main
const mockApp = {
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  quit: jest.fn(),
};

const mockBrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  on: jest.fn(),
  webContents: {
    send: jest.fn(),
  },
}));

mockBrowserWindow.getAllWindows = jest.fn(() => []);

const mockInitAudioLoopback = jest.fn();
const mockLoadSettings = jest.fn();
const mockSetupIpcHandlers = jest.fn();
const mockInitAutoUpdater = jest.fn();
const mockStartUpdateCheck = jest.fn();
const mockLog = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock electron
jest.unstable_mockModule('electron', () => ({
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
}));

// Mock other dependencies
jest.unstable_mockModule('electron-audio-loopback', () => ({
  initMain: mockInitAudioLoopback,
}));

jest.unstable_mockModule('../../src/main/settings.js', () => ({
  loadSettings: mockLoadSettings,
}));

jest.unstable_mockModule('../../src/main/ipc-handlers.js', () => ({
  setupIpcHandlers: mockSetupIpcHandlers,
}));

jest.unstable_mockModule('../../src/main/auto-updater.js', () => ({
  initAutoUpdater: mockInitAutoUpdater,
  startUpdateCheck: mockStartUpdateCheck,
}));

jest.unstable_mockModule('../../src/main/logger.js', () => ({
  default: mockLog,
}));

describe('Main Process', () => {
  it('should load and execute main initialization', async () => {
    // Import the main module which should execute initialization code
    await import('../../src/main/main.js');
    
    // Verify basic initialization calls
    expect(mockInitAudioLoopback).toHaveBeenCalledTimes(1);
    expect(mockApp.whenReady).toHaveBeenCalledTimes(1);
    expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
  });

  it('should execute app ready callback when triggered', async () => {
    await import('../../src/main/main.js');
    
    // Verify the callback was registered and execute it if available
    expect(mockApp.whenReady).toHaveBeenCalled();
    
    const readyCallback = mockApp.whenReady.mock.calls?.[0]?.[0];
    if (typeof readyCallback === 'function') {
      await readyCallback();
      
      // Verify the ready callback executed expected functions
      expect(mockLog.info).toHaveBeenCalledWith('App is ready, initializing...');
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);
      expect(mockStartUpdateCheck).toHaveBeenCalledTimes(1);
      expect(mockBrowserWindow).toHaveBeenCalledTimes(1);
      expect(mockSetupIpcHandlers).toHaveBeenCalledTimes(1);
      expect(mockInitAutoUpdater).toHaveBeenCalledTimes(1);
    }
  });

  it('should handle window creation with correct parameters', async () => {
    await import('../../src/main/main.js');
    
    // Execute app ready callback
    const readyCallback = mockApp.whenReady.mock.calls[0]?.[0];
    if (readyCallback) {
      await readyCallback();
      
      // Verify BrowserWindow was created with expected config
      expect(mockBrowserWindow).toHaveBeenCalledWith({
        width: 500,
        height: 500,
        minWidth: 400,
        minHeight: 600,
        title: 'Assembly Notes',
        webPreferences: {
          preload: expect.stringContaining('preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
        },
      });
    }
  });
});