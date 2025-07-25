import { jest } from '@jest/globals';

describe('Global Type Definitions', () => {
  it('should have electronAPI interface defined on Window', () => {
    // Create a minimal mock window object that satisfies the type definitions
    const mockWindow = {
      electronAPI: {
        enableLoopbackAudio: jest.fn(),
        disableLoopbackAudio: jest.fn(),
        startRecording: jest.fn(),
        stopRecording: jest.fn(),
        sendMicrophoneAudio: jest.fn(),
        sendSystemAudio: jest.fn(),
        onTranscript: jest.fn(),
        onConnectionStatus: jest.fn(),
        onError: jest.fn(),
        onStartAudioCapture: jest.fn(),
        onStopAudioCapture: jest.fn(),
        onRecordingStopped: jest.fn(),
        removeAllListeners: jest.fn(),
        getSettings: jest.fn(),
        saveSettings: jest.fn(),
        installUpdate: jest.fn(),
        quitAndInstall: jest.fn(),
        checkForUpdates: jest.fn(),
        onUpdateAvailable: jest.fn(),
        onDownloadProgress: jest.fn(),
        onUpdateDownloaded: jest.fn(),
      },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    } as Window;

    // Verify the structure exists and has the expected properties
    expect(mockWindow.electronAPI).toBeDefined();
    expect(mockWindow.logger).toBeDefined();
    
    // Test that all electronAPI methods exist
    expect(typeof mockWindow.electronAPI.enableLoopbackAudio).toBe('function');
    expect(typeof mockWindow.electronAPI.disableLoopbackAudio).toBe('function');
    expect(typeof mockWindow.electronAPI.startRecording).toBe('function');
    expect(typeof mockWindow.electronAPI.stopRecording).toBe('function');
    expect(typeof mockWindow.electronAPI.sendMicrophoneAudio).toBe('function');
    expect(typeof mockWindow.electronAPI.sendSystemAudio).toBe('function');
    expect(typeof mockWindow.electronAPI.getSettings).toBe('function');
    expect(typeof mockWindow.electronAPI.saveSettings).toBe('function');
    
    // Test that all logger methods exist
    expect(typeof mockWindow.logger.info).toBe('function');
    expect(typeof mockWindow.logger.warn).toBe('function');
    expect(typeof mockWindow.logger.error).toBe('function');
    expect(typeof mockWindow.logger.debug).toBe('function');
  });

  it('should allow electronAPI methods to be called with correct signatures', () => {
    const mockWindow = {
      electronAPI: {
        enableLoopbackAudio: jest.fn(() => Promise.resolve()),
        startRecording: jest.fn(() => Promise.resolve(true)),
        sendMicrophoneAudio: jest.fn(),
        onTranscript: jest.fn(),
        getSettings: jest.fn(() => Promise.resolve({})),
        saveSettings: jest.fn(() => Promise.resolve(true)),
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
    } as Partial<Window> as Window;

    // Test method calls don't cause TypeScript compilation errors
    expect(() => {
      mockWindow.electronAPI.enableLoopbackAudio();
      mockWindow.electronAPI.startRecording();
      mockWindow.electronAPI.sendMicrophoneAudio(new ArrayBuffer(8));
      mockWindow.electronAPI.onTranscript(() => {});
      mockWindow.electronAPI.getSettings();
      mockWindow.electronAPI.saveSettings({});
      mockWindow.logger.info('test');
      mockWindow.logger.error('error');
    }).not.toThrow();
  });
});