declare global {
  interface Window {
    electronAPI: {
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
    };
    logger: {
      info: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      error: (...args: any[]) => void;
      debug: (...args: any[]) => void;
    };
  }
}

export {};
