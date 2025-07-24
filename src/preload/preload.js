const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio loopback control
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),

  // Recording control
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),

  // Send audio data to main process
  sendMicrophoneAudio: (data) =>
    ipcRenderer.send('microphone-audio-data', data),
  sendSystemAudio: (data) => ipcRenderer.send('system-audio-data', data),

  // Event listeners
  onTranscript: (callback) =>
    ipcRenderer.on('transcript', (event, data) => callback(data)),
  onConnectionStatus: (callback) =>
    ipcRenderer.on('connection-status', (event, data) => callback(data)),
  onError: (callback) =>
    ipcRenderer.on('error', (event, message) => callback(message)),
  onStartAudioCapture: (callback) =>
    ipcRenderer.on('start-audio-capture', () => callback()),
  onStopAudioCapture: (callback) =>
    ipcRenderer.on('stop-audio-capture', () => callback()),
  onRecordingStopped: (callback) =>
    ipcRenderer.on('recording-stopped', (event, data) => callback(data)),

  // Remove event listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Auto-updater
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback) =>
    ipcRenderer.on('update-available', (event, info) => callback(info)),
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', (event, progress) =>
      callback(progress)
    ),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
});

// Expose logger to renderer (sends to main process)
contextBridge.exposeInMainWorld('logger', {
  info: (...args) => ipcRenderer.send('log', 'info', ...args),
  warn: (...args) => ipcRenderer.send('log', 'warn', ...args),
  error: (...args) => ipcRenderer.send('log', 'error', ...args),
  debug: (...args) => ipcRenderer.send('log', 'debug', ...args),
});
