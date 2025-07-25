import { jest } from '@jest/globals';

jest.mock('electron-updater');
jest.mock('../src/main/logger');

interface MockAutoUpdater {
  on: jest.MockedFunction<
    (event: string, listener: (...args: any[]) => void) => void
  >;
  checkForUpdatesAndNotify: jest.MockedFunction<() => Promise<any>>;
  quitAndInstall: jest.MockedFunction<() => void>;
  logger: any;
}

interface MockLogger {
  info: jest.MockedFunction<(message: string, ...args: any[]) => void>;
  error: jest.MockedFunction<(message: string, ...args: any[]) => void>;
}

interface MockWindow {
  webContents: {
    send: jest.MockedFunction<(channel: string, ...args: any[]) => void>;
  };
}

describe('Auto-Updater Module', () => {
  let autoUpdater: MockAutoUpdater;
  let mockLogger: MockLogger;
  let mockWindow: MockWindow;
  let autoUpdaterModule: {
    initAutoUpdater: (window: MockWindow | null) => void;
    checkForUpdatesAndNotify: () => void;
    quitAndInstall: () => void;
    startUpdateCheck: (delay?: number) => void;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock electron-updater
    autoUpdater = {
      on: jest.fn(),
      checkForUpdatesAndNotify: jest.fn(),
      quitAndInstall: jest.fn(),
      logger: null,
    };

    jest.doMock('electron-updater', () => ({
      autoUpdater,
    }));

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../src/main/logger', () => mockLogger);

    // Mock main window
    mockWindow = {
      webContents: {
        send: jest.fn(),
      },
    };

    // Re-require the module after mocks are set up
    autoUpdaterModule = (await import('../src/main/auto-updater')) as any;
  });

  describe('initAutoUpdater', () => {
    it('should initialize auto-updater with window reference', () => {
      autoUpdaterModule.initAutoUpdater(mockWindow);

      expect(autoUpdater.logger).toBe(mockLogger);
      expect(autoUpdater.on).toHaveBeenCalledTimes(6);
      expect(autoUpdater.on).toHaveBeenCalledWith(
        'checking-for-update',
        expect.any(Function)
      );
      expect(autoUpdater.on).toHaveBeenCalledWith(
        'update-available',
        expect.any(Function)
      );
      expect(autoUpdater.on).toHaveBeenCalledWith(
        'update-not-available',
        expect.any(Function)
      );
      expect(autoUpdater.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(autoUpdater.on).toHaveBeenCalledWith(
        'download-progress',
        expect.any(Function)
      );
      expect(autoUpdater.on).toHaveBeenCalledWith(
        'update-downloaded',
        expect.any(Function)
      );
    });

    it('should handle null window reference', () => {
      expect(() => {
        autoUpdaterModule.initAutoUpdater(null);
      }).not.toThrow();

      expect(autoUpdater.logger).toBe(mockLogger);
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      autoUpdaterModule.initAutoUpdater(mockWindow);
    });

    it('should handle checking-for-update event', () => {
      const checkingHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'checking-for-update'
      )![1];

      checkingHandler();

      expect(mockLogger.info).toHaveBeenCalledWith('Checking for update...');
    });

    it('should handle update-available event', () => {
      const updateAvailableHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'update-available'
      )![1];

      const updateInfo = { version: '1.0.1' };
      updateAvailableHandler(updateInfo);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Update available.',
        updateInfo
      );
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'update-available',
        updateInfo
      );
    });

    it('should handle update-available event without window', () => {
      autoUpdaterModule.initAutoUpdater(null);
      const updateAvailableHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'update-available'
      )![1];

      const updateInfo = { version: '1.0.1' };
      updateAvailableHandler(updateInfo);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Update available.',
        updateInfo
      );
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should handle update-not-available event', () => {
      const updateNotAvailableHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'update-not-available'
      )![1];

      const updateInfo = { version: '1.0.0' };
      updateNotAvailableHandler(updateInfo);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Update not available.',
        updateInfo
      );
    });

    it('should handle error event', () => {
      const errorHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'error'
      )![1];

      const error = new Error('Update failed');
      errorHandler(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in auto-updater:',
        error
      );
    });

    it('should handle download-progress event', () => {
      const downloadProgressHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'download-progress'
      )![1];

      const progressObj = {
        bytesPerSecond: 1024,
        percent: 50,
        transferred: 500,
        total: 1000,
      };

      downloadProgressHandler(progressObj);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Download speed: 1024 - Downloaded 50% (500/1000)'
      );
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'download-progress',
        progressObj
      );
    });

    it('should handle download-progress event without window', () => {
      autoUpdaterModule.initAutoUpdater(null);
      const downloadProgressHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'download-progress'
      )![1];

      const progressObj = {
        bytesPerSecond: 1024,
        percent: 50,
        transferred: 500,
        total: 1000,
      };

      downloadProgressHandler(progressObj);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Download speed: 1024 - Downloaded 50% (500/1000)'
      );
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should handle update-downloaded event', () => {
      const updateDownloadedHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'update-downloaded'
      )![1];

      const updateInfo = { version: '1.0.1' };
      updateDownloadedHandler(updateInfo);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Update downloaded',
        updateInfo
      );
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'update-downloaded',
        updateInfo
      );
    });

    it('should handle update-downloaded event without window', () => {
      autoUpdaterModule.initAutoUpdater(null);
      const updateDownloadedHandler = autoUpdater.on.mock.calls.find(
        (call) => call[0] === 'update-downloaded'
      )![1];

      const updateInfo = { version: '1.0.1' };
      updateDownloadedHandler(updateInfo);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Update downloaded',
        updateInfo
      );
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('checkForUpdatesAndNotify', () => {
    it('should call autoUpdater.checkForUpdatesAndNotify', () => {
      autoUpdaterModule.checkForUpdatesAndNotify();

      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('quitAndInstall', () => {
    it('should call autoUpdater.quitAndInstall', () => {
      autoUpdaterModule.quitAndInstall();

      expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe('startUpdateCheck', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should check for updates after default delay', () => {
      autoUpdaterModule.startUpdateCheck();

      expect(autoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3000);

      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
    });

    it('should check for updates after custom delay', () => {
      autoUpdaterModule.startUpdateCheck(5000);

      expect(autoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();

      jest.advanceTimersByTime(4999);
      expect(autoUpdater.checkForUpdatesAndNotify).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
    });

    it('should handle zero delay', () => {
      autoUpdaterModule.startUpdateCheck(0);

      jest.advanceTimersByTime(0);

      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('module exports', () => {
    it('should export all required functions', () => {
      expect(typeof autoUpdaterModule.initAutoUpdater).toBe('function');
      expect(typeof autoUpdaterModule.checkForUpdatesAndNotify).toBe(
        'function'
      );
      expect(typeof autoUpdaterModule.quitAndInstall).toBe('function');
      expect(typeof autoUpdaterModule.startUpdateCheck).toBe('function');
    });
  });
});
