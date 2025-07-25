import { jest } from '@jest/globals';
import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

// Mock main window
const mockMainWindow = {
  webContents: {
    send: jest.fn(),
  },
} as unknown as BrowserWindow;

describe('Auto-updater', () => {
  let initAutoUpdater: any;
  let checkForUpdatesAndNotify: any;
  let quitAndInstall: any;
  let startUpdateCheck: any;
  let mockLog: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clear mock calls
    (autoUpdater.on as jest.Mock).mockClear();
    (autoUpdater.checkForUpdatesAndNotify as jest.Mock).mockClear();
    (autoUpdater.quitAndInstall as jest.Mock).mockClear();
    (mockMainWindow.webContents.send as jest.Mock).mockClear();
    
    // Reset logger reference
    autoUpdater.logger = null;

    // Import modules
    const autoUpdaterModule = await import('../../src/main/auto-updater.ts');
    mockLog = (await import('../../src/main/logger.js')).default;
    
    initAutoUpdater = autoUpdaterModule.initAutoUpdater;
    checkForUpdatesAndNotify = autoUpdaterModule.checkForUpdatesAndNotify;
    quitAndInstall = autoUpdaterModule.quitAndInstall;
    startUpdateCheck = autoUpdaterModule.startUpdateCheck;
  });

  describe('initAutoUpdater', () => {
    it('should initialize auto-updater with window reference', () => {
      initAutoUpdater(mockMainWindow as any);

      expect(autoUpdater.logger).toBeTruthy();
      expect(autoUpdater.on).toHaveBeenCalledTimes(6);
    });

    it('should set up all event handlers', () => {
      initAutoUpdater(mockMainWindow as any);

      expect(autoUpdater.on).toHaveBeenCalledWith('checking-for-update', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function));
      expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
    });
  });


  describe('checkForUpdatesAndNotify', () => {
    it('should call autoUpdater.checkForUpdatesAndNotify', () => {
      checkForUpdatesAndNotify();

      expect(autoUpdater.checkForUpdatesAndNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe('quitAndInstall', () => {
    it('should call autoUpdater.quitAndInstall', () => {
      quitAndInstall();

      expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
    });
  });

});