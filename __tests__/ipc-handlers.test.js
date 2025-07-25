const { setupIpcHandlers } = require('../src/main/ipc-handlers.js');
const { ipcMain } = require('electron');

// Mock dependencies
jest.mock('electron', () => ({
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
  },
}));

jest.mock('../src/main/settings.js', () => ({
  getSettings: jest.fn(() => ({ testSetting: 'value' })),
  saveSettingsToFile: jest.fn(),
}));

jest.mock('../src/main/slack.js', () => ({
  resetSlackClient: jest.fn(),
}));

jest.mock('../src/main/transcription.js', () => ({
  startTranscription: jest.fn(() => Promise.resolve('started')),
  stopTranscription: jest.fn(() => Promise.resolve('stopped')),
  sendMicrophoneAudio: jest.fn(),
  sendSystemAudio: jest.fn(),
  resetAai: jest.fn(),
}));

jest.mock('../src/main/auto-updater.js', () => ({
  checkForUpdatesAndNotify: jest.fn(),
  quitAndInstall: jest.fn(),
}));

jest.mock('../src/main/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('electron-updater', () => ({
  autoUpdater: {
    downloadUpdate: jest.fn(),
  },
}));

describe('IPC Handlers', () => {
  let mockMainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMainWindow = { webContents: { send: jest.fn() } };
  });

  describe('setupIpcHandlers', () => {
    it('should register all IPC handlers', () => {
      setupIpcHandlers(mockMainWindow);

      expect(ipcMain.on).toHaveBeenCalledWith('log', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('microphone-audio-data', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('system-audio-data', expect.any(Function));
      
      expect(ipcMain.handle).toHaveBeenCalledWith('start-recording', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('stop-recording', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-settings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('save-settings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('install-update', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('quit-and-install', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('check-for-updates', expect.any(Function));
    });

    it('should handle log messages from renderer', () => {
      const { getSettings } = require('../src/main/settings.js');
      const log = require('../src/main/logger.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the log handler
      const logHandler = ipcMain.on.mock.calls.find(call => call[0] === 'log')[1];
      
      // Test log handler
      const mockEvent = {};
      logHandler(mockEvent, 'info', 'test message', { data: 'object' });
      
      expect(log.info).toHaveBeenCalledWith('[Renderer] test message {"data":"object"}');
    });

    it('should handle microphone audio data', () => {
      const { sendMicrophoneAudio } = require('../src/main/transcription.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the microphone audio handler
      const micHandler = ipcMain.on.mock.calls.find(call => call[0] === 'microphone-audio-data')[1];
      
      const mockEvent = {};
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      micHandler(mockEvent, mockAudioData);
      
      expect(sendMicrophoneAudio).toHaveBeenCalledWith(mockAudioData);
    });

    it('should handle system audio data', () => {
      const { sendSystemAudio } = require('../src/main/transcription.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the system audio handler  
      const sysHandler = ipcMain.on.mock.calls.find(call => call[0] === 'system-audio-data')[1];
      
      const mockEvent = {};
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      sysHandler(mockEvent, mockAudioData);
      
      expect(sendSystemAudio).toHaveBeenCalledWith(mockAudioData);
    });

    it('should handle start-recording request', async () => {
      const { startTranscription } = require('../src/main/transcription.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the start-recording handler
      const startHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'start-recording')[1];
      
      const result = await startHandler();
      
      expect(startTranscription).toHaveBeenCalledWith(mockMainWindow);
      expect(result).toBe('started');
    });

    it('should handle stop-recording request', async () => {
      const { stopTranscription } = require('../src/main/transcription.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the stop-recording handler
      const stopHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'stop-recording')[1];
      
      const result = await stopHandler();
      
      expect(stopTranscription).toHaveBeenCalledWith(mockMainWindow);
      expect(result).toBe('stopped');
    });

    it('should handle get-settings request', () => {
      const { getSettings } = require('../src/main/settings.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the get-settings handler
      const getHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'get-settings')[1];
      
      const result = getHandler();
      
      expect(getSettings).toHaveBeenCalled();
      expect(result).toEqual({ testSetting: 'value' });
    });

    it('should handle save-settings request', () => {
      const { saveSettingsToFile } = require('../src/main/settings.js');
      const { resetSlackClient } = require('../src/main/slack.js');
      const { resetAai } = require('../src/main/transcription.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the save-settings handler
      const saveHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'save-settings')[1];
      
      const mockSettings = { newSetting: 'newValue' };
      const mockEvent = {};
      const result = saveHandler(mockEvent, mockSettings);
      
      expect(saveSettingsToFile).toHaveBeenCalledWith(mockSettings);
      expect(resetSlackClient).toHaveBeenCalled();
      expect(resetAai).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle install-update request', () => {
      const { autoUpdater } = require('electron-updater');
      
      setupIpcHandlers(mockMainWindow);

      // Find the install-update handler
      const installHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'install-update')[1];
      
      installHandler();
      
      expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    it('should handle quit-and-install request', () => {
      const { quitAndInstall } = require('../src/main/auto-updater.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the quit-and-install handler
      const quitHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'quit-and-install')[1];
      
      quitHandler();
      
      expect(quitAndInstall).toHaveBeenCalled();
    });

    it('should handle check-for-updates request', () => {
      const { checkForUpdatesAndNotify } = require('../src/main/auto-updater.js');
      
      setupIpcHandlers(mockMainWindow);

      // Find the check-for-updates handler
      const checkHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'check-for-updates')[1];
      
      checkHandler();
      
      expect(checkForUpdatesAndNotify).toHaveBeenCalled();
    });
  });
});