import '@testing-library/jest-dom';

// Mock electron APIs for renderer tests
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    },
  },
});

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: {
    getAllRecordings: jest.fn().mockResolvedValue([]),
    searchRecordings: jest.fn().mockResolvedValue([]),
    deleteRecording: jest.fn().mockResolvedValue(true),
    newRecording: jest.fn().mockResolvedValue('test-id'),
    getSettings: jest.fn().mockResolvedValue({}),
    saveSettings: jest.fn().mockResolvedValue(true),
    startRecording: jest.fn().mockResolvedValue(true),
    stopRecording: jest.fn().mockResolvedValue(true),
    summarizeTranscript: jest.fn().mockResolvedValue(true),
    getRecording: jest.fn().mockResolvedValue(null),
    loadRecording: jest.fn().mockResolvedValue(null),
    updateRecordingTitle: jest.fn().mockResolvedValue(true),
    postToSlack: jest.fn().mockResolvedValue(true),
    savePrompt: jest.fn().mockResolvedValue(true),
    savePrompts: jest.fn().mockResolvedValue(true),
    slackOAuthInitiate: jest.fn().mockResolvedValue(null),
    slackOAuthGetCurrent: jest.fn().mockResolvedValue(null),
    slackOAuthRemoveInstallation: jest.fn().mockResolvedValue(true),
    slackOAuthValidateChannels: jest.fn().mockResolvedValue(true),
    enableLoopbackAudio: jest.fn().mockResolvedValue(undefined),
    disableLoopbackAudio: jest.fn().mockResolvedValue(undefined),
    sendMicrophoneAudio: jest.fn(),
    sendSystemAudio: jest.fn(),
    onTranscript: jest.fn(),
    onSummary: jest.fn(),
    onSummarizationStarted: jest.fn(),
    onSummarizationCompleted: jest.fn(),
    onConnectionStatus: jest.fn(),
    onRecordingStopped: jest.fn(),
    removeListener: jest.fn(),
    onUpdateAvailable: jest.fn(),
    onDownloadProgress: jest.fn(),
    onUpdateDownloaded: jest.fn(),
    onUpdateError: jest.fn(),
    onUpdateReadyToInstall: jest.fn(),
    installUpdate: jest.fn().mockResolvedValue(true),
    quitAndInstall: jest.fn().mockResolvedValue(true),
    checkForUpdates: jest.fn().mockResolvedValue(undefined),
    getUpdateStatus: jest.fn().mockResolvedValue({}),
    updateRecordingSummary: jest.fn().mockResolvedValue(true),
  },
  configurable: true,
});
