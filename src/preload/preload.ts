import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  enableLoopbackAudio: () => Promise<void>;
  disableLoopbackAudio: () => Promise<void>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<boolean>;
  sendMicrophoneAudio: (data: ArrayBuffer) => void;
  sendSystemAudio: (data: ArrayBuffer) => void;
  onTranscript: (callback: (data: any) => void) => void;
  onConnectionStatus: (callback: (data: any) => void) => void;
  onError: (callback: (message: string) => void) => void;
  onStartAudioCapture: (callback: () => void) => void;
  onStopAudioCapture: (callback: () => void) => void;
  onRecordingStopped: (callback: (data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  installUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onDownloadProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
}

interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    logger: Logger;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio loopback control
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),

  // Recording control
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),

  // Send audio data to main process
  sendMicrophoneAudio: (data: ArrayBuffer) =>
    ipcRenderer.send('microphone-audio-data', data),
  sendSystemAudio: (data: ArrayBuffer) =>
    ipcRenderer.send('system-audio-data', data),

  // Event listeners
  onTranscript: (callback: (data: any) => void) =>
    ipcRenderer.on('transcript', (_event, data) => callback(data)),
  onConnectionStatus: (callback: (data: any) => void) =>
    ipcRenderer.on('connection-status', (_event, data) => callback(data)),
  onError: (callback: (message: string) => void) =>
    ipcRenderer.on('error', (_event, message) => callback(message)),
  onStartAudioCapture: (callback: () => void) =>
    ipcRenderer.on('start-audio-capture', () => callback()),
  onStopAudioCapture: (callback: () => void) =>
    ipcRenderer.on('stop-audio-capture', () => callback()),
  onRecordingStopped: (callback: (data: any) => void) =>
    ipcRenderer.on('recording-stopped', (_event, data) => callback(data)),

  // Remove event listeners
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),

  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) =>
    ipcRenderer.invoke('save-settings', settings),

  // Auto-updater
  installUpdate: () => ipcRenderer.invoke('install-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback: (info: any) => void) =>
    ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onDownloadProgress: (callback: (progress: any) => void) =>
    ipcRenderer.on('download-progress', (_event, progress) =>
      callback(progress)
    ),
  onUpdateDownloaded: (callback: (info: any) => void) =>
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
});

// Expose logger to renderer (sends to main process)
contextBridge.exposeInMainWorld('logger', {
  info: (...args: any[]) => ipcRenderer.send('log', 'info', ...args),
  warn: (...args: any[]) => ipcRenderer.send('log', 'warn', ...args),
  error: (...args: any[]) => ipcRenderer.send('log', 'error', ...args),
  debug: (...args: any[]) => ipcRenderer.send('log', 'debug', ...args),
});
