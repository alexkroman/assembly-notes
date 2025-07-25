import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('electron', () => ({
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
  },
}));

jest.mock('../src/main/settings', () => ({
  getSettings: jest.fn(() => ({ testSetting: 'value' })),
  saveSettingsToFile: jest.fn(),
}));

jest.mock('../src/main/recordingManager', () => ({
  startTranscription: jest.fn(() => Promise.resolve('started')),
  stopTranscription: jest.fn(() => Promise.resolve('stopped')),
  sendMicrophoneAudio: jest.fn(),
  sendSystemAudio: jest.fn(),
  resetAai: jest.fn(),
}));

jest.mock('../src/main/auto-updater', () => ({
  checkForUpdatesAndNotify: jest.fn(),
  quitAndInstall: jest.fn(),
}));

jest.mock('../src/main/logger', () => ({
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


interface MockMainWindow {
  webContents: {
    send: jest.MockedFunction<(channel: string, ...args: any[]) => void>;
  };
}

describe('IPC Handlers', () => {
  let mockMainWindow: MockMainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMainWindow = { webContents: { send: jest.fn() } };
  });

  describe('setupIpcHandlers', () => {
    it('should register all IPC handlers', async () => {
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      expect(ipcMain.on).toHaveBeenCalledWith('log', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith(
        'microphone-audio-data',
        expect.any(Function)
      );
      expect(ipcMain.on).toHaveBeenCalledWith(
        'system-audio-data',
        expect.any(Function)
      );

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'start-recording',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'stop-recording',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'get-settings',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'save-settings',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'install-update',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'quit-and-install',
        expect.any(Function)
      );
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'check-for-updates',
        expect.any(Function)
      );
    });

    it('should handle log messages from renderer', async () => {
      const log = await import('../src/main/logger');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the log handler
      const logHandler = (ipcMain.on as any).mock.calls.find(
        (call: any) => call[0] === 'log'
      )![1];

      // Test log handler
      const mockEvent = {};
      logHandler(mockEvent, 'info', 'test message', { data: 'object' });

      expect((log as any).info).toHaveBeenCalledWith(
        '[Renderer] test message {"data":"object"}'
      );
    });

    it('should handle microphone audio data', async () => {
      const recordingManager = await import('../src/main/recordingManager');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the microphone audio handler
      const micHandler = (ipcMain.on as any).mock.calls.find(
        (call: any) => call[0] === 'microphone-audio-data'
      )![1];

      const mockEvent = {};
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      micHandler(mockEvent, mockAudioData);

      expect(recordingManager.sendMicrophoneAudio).toHaveBeenCalledWith(
        mockAudioData
      );
    });

    it('should handle system audio data', async () => {
      const recordingManager = await import('../src/main/recordingManager');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the system audio handler
      const sysHandler = (ipcMain.on as any).mock.calls.find(
        (call: any) => call[0] === 'system-audio-data'
      )![1];

      const mockEvent = {};
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      sysHandler(mockEvent, mockAudioData);

      expect(recordingManager.sendSystemAudio).toHaveBeenCalledWith(
        mockAudioData
      );
    });

    it('should handle start-recording request', async () => {
      const recordingManager = await import('../src/main/recordingManager');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the start-recording handler
      const startHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'start-recording'
      )![1];

      const result = await startHandler();

      expect(recordingManager.startTranscription).toHaveBeenCalledWith(
        mockMainWindow
      );
      expect(result).toBe('started');
    });

    it('should handle stop-recording request', async () => {
      const recordingManager = await import('../src/main/recordingManager');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the stop-recording handler
      const stopHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'stop-recording'
      )![1];

      const result = await stopHandler();

      expect(recordingManager.stopTranscription).toHaveBeenCalledWith(
        mockMainWindow
      );
      expect(result).toBe('stopped');
    });

    it('should handle get-settings request', async () => {
      const settings = await import('../src/main/settings');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the get-settings handler
      const getHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'get-settings'
      )![1];

      const result = getHandler();

      expect(settings.getSettings).toHaveBeenCalled();
      expect(result).toEqual({ testSetting: 'value' });
    });

    it('should handle save-settings request', async () => {
      const settings = await import('../src/main/settings');
      const recordingManager = await import('../src/main/recordingManager');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the save-settings handler
      const saveHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'save-settings'
      )![1];

      const mockSettings = { newSetting: 'newValue' };
      const mockEvent = {};
      const result = saveHandler(mockEvent, mockSettings);

      expect(settings.saveSettingsToFile).toHaveBeenCalledWith(mockSettings);
      expect(recordingManager.resetAai).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle install-update request', async () => {
      const { autoUpdater } = await import('electron-updater');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the install-update handler
      const installHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'install-update'
      )![1];

      installHandler();

      expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    it('should handle quit-and-install request', async () => {
      const autoUpdaterModule = await import('../src/main/auto-updater');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the quit-and-install handler
      const quitHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'quit-and-install'
      )![1];

      quitHandler();

      expect(autoUpdaterModule.quitAndInstall).toHaveBeenCalled();
    });

    it('should handle check-for-updates request', async () => {
      const autoUpdaterModule = await import('../src/main/auto-updater');
      const { ipcMain } = await import('electron');
      const { setupIpcHandlers } = await import('../src/main/ipc-handlers');

      setupIpcHandlers(mockMainWindow as any);

      // Find the check-for-updates handler
      const checkHandler = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === 'check-for-updates'
      )![1];

      checkHandler();

      expect(autoUpdaterModule.checkForUpdatesAndNotify).toHaveBeenCalled();
    });
  });
});
