import { jest } from '@jest/globals';
import { autoUpdater } from 'electron-updater';
// Mock main window
const mockMainWindow = {
    webContents: {
        send: jest.fn(),
    },
};
describe('Auto-updater', () => {
    let initAutoUpdater;
    let checkForUpdatesAndNotify;
    let quitAndInstall;
    beforeEach(async () => {
        jest.clearAllMocks();
        // Clear mock calls
        autoUpdater.on.mockClear();
        autoUpdater.checkForUpdatesAndNotify.mockClear();
        autoUpdater.quitAndInstall.mockClear();
        mockMainWindow.webContents.send.mockClear();
        // Reset logger reference
        autoUpdater.logger = null;
        // Import modules
        const autoUpdaterModule = await import('../../src/main/auto-updater.ts');
        initAutoUpdater = autoUpdaterModule.initAutoUpdater;
        checkForUpdatesAndNotify = autoUpdaterModule.checkForUpdatesAndNotify;
        quitAndInstall = autoUpdaterModule.quitAndInstall;
    });
    describe('initAutoUpdater', () => {
        it('should initialize auto-updater with window reference', () => {
            initAutoUpdater(mockMainWindow);
            expect(autoUpdater.logger).toBeTruthy();
            expect(autoUpdater.on).toHaveBeenCalledTimes(6);
        });
        it('should set up all event handlers', () => {
            initAutoUpdater(mockMainWindow);
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
//# sourceMappingURL=auto-updater.test.js.map