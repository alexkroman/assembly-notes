import { contextBridge, ipcRenderer } from 'electron';

// Simple preload script for dictation status window
const dictationAPI = {
  onDictationStatusUpdate: (callback: (isDictating: boolean) => void) => {
    ipcRenderer.on('dictation-status-update', (_event, isDictating) => {
      callback(isDictating as boolean);
    });
  },
};

contextBridge.exposeInMainWorld('electronAPI', dictationAPI);
