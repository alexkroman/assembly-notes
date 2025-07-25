import { jest } from '@jest/globals';
export const mockElectronAPI = {
    sendMicrophoneAudio: jest.fn(),
    sendSystemAudio: jest.fn(),
    onUpdateAvailable: jest.fn(),
    onDownloadProgress: jest.fn(),
    onUpdateDownloaded: jest.fn(),
    installUpdate: jest.fn(),
    quitAndInstall: jest.fn(),
};
//# sourceMappingURL=electron-api.js.map