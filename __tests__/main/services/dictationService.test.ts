import 'reflect-metadata';
import robotjs from '@jitsi/robotjs';
import { Store } from '@reduxjs/toolkit';
import { BrowserWindow, globalShortcut } from 'electron';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { DictationService } from '../../../src/main/services/dictationService';
import { resetTestContainer } from '../../test-helpers/container-setup';

jest.mock('@jitsi/robotjs', () => ({
  typeString: jest.fn(),
}));

jest.mock('@sentry/electron/main', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn().mockReturnValue('/mock/path'),
    getName: jest.fn().mockReturnValue('assembly-notes'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
  },
  globalShortcut: {
    register: jest.fn(),
    unregister: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(),
  },
}));

jest.mock('electron-log', () => {
  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    transports: {
      file: {
        level: 'info',
        format: '',
        resolvePathFn: jest.fn(),
      },
      console: {
        level: 'debug',
        format: '',
      },
    },
    hooks: [],
    errorHandler: {
      startCatching: jest.fn(),
    },
  };
  return {
    ...mockLog,
    default: mockLog,
  };
});

const createDefaultState = (overrides = {}) => ({
  recording: {
    status: 'idle',
    recordingId: null,
    startTime: null,
    error: null,
    connectionStatus: { microphone: false, system: false },
    isDictating: false,
    isTransitioning: false,
    ...overrides,
  },
  recordings: {
    currentRecording: null,
  },
  transcription: {
    currentTranscript: '',
    isTranscribing: false,
  },
  settings: {
    assemblyaiKey: 'test-api-key',
    dictationStylingEnabled: false,
    dictationStylingPrompt: 'Test prompt',
    dictationSilenceTimeout: 2000,
  },
});

const mockStore = {
  getState: jest.fn(() => createDefaultState()),
  dispatch: jest.fn(),
  subscribe: jest.fn(() => jest.fn()),
} as any;

const mockTranscriptionService = {
  onDictationText: jest.fn(),
  offDictationText: jest.fn(),
} as any;

const mockRecordingManager = {
  isRecording: jest.fn(() => false),
  startTranscriptionForDictation: jest.fn(),
  stopTranscriptionForDictation: jest.fn(),
} as any;

const mockDictationStatusWindow = {
  updateStatus: jest.fn(),
} as any;

const mockMainWindow = {
  webContents: { send: jest.fn() },
} as unknown as BrowserWindow;

const mockAssemblyAIFactory = {
  createClient: jest.fn().mockReturnValue({
    lemur: {
      task: jest.fn().mockResolvedValue({ response: 'styled text' }),
    },
  }),
} as any;

describe('DictationService', () => {
  let dictationService: DictationService;

  beforeEach(() => {
    resetTestContainer();
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockStore.getState.mockReturnValue(createDefaultState());
    mockRecordingManager.isRecording.mockReturnValue(false);
    (globalShortcut.register as jest.Mock).mockReturnValue(true);
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([
      mockMainWindow,
    ]);

    container.register(DI_TOKENS.Store, {
      useValue: mockStore as unknown as Store,
    });
    container.register(DI_TOKENS.TranscriptionService, {
      useValue: mockTranscriptionService,
    });
    container.register(DI_TOKENS.RecordingManager, {
      useValue: mockRecordingManager,
    });
    container.register(DI_TOKENS.DictationStatusWindow, {
      useValue: mockDictationStatusWindow,
    });
    container.register(DI_TOKENS.AssemblyAIFactoryWithLemur, {
      useValue: mockAssemblyAIFactory,
    });

    dictationService = container.resolve(DictationService);
  });

  afterEach(() => {
    jest.useRealTimers();
    resetTestContainer();
  });

  describe('initialize', () => {
    it('should register the correct shortcut for macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      dictationService.initialize();

      expect(globalShortcut.register).toHaveBeenCalledWith(
        'Control+Option+D',
        expect.any(Function)
      );

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should register the correct shortcut for Windows/Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      dictationService.initialize();

      expect(globalShortcut.register).toHaveBeenCalledWith(
        'Ctrl+Alt+D',
        expect.any(Function)
      );

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should handle shortcut registration failure', () => {
      (globalShortcut.register as jest.Mock).mockReturnValue(false);

      dictationService.initialize();

      expect(globalShortcut.register).toHaveBeenCalled();
    });

    it('should handle registration exception', () => {
      (globalShortcut.register as jest.Mock).mockImplementation(() => {
        throw new Error('Registration failed');
      });

      expect(() => dictationService.initialize()).not.toThrow();
    });
  });

  describe('startDictation', () => {
    it('should successfully start dictation', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );

      await dictationService.startDictation();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: true })
      );
      expect(mockTranscriptionService.onDictationText).toHaveBeenCalledWith(
        expect.any(Function)
      );
      expect(
        mockRecordingManager.startTranscriptionForDictation
      ).toHaveBeenCalled();

      jest.advanceTimersByTime(400);

      expect(mockDictationStatusWindow.updateStatus).toHaveBeenCalledWith(true);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'dictation-status',
        true
      );
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: false })
      );
    });

    it('should not start if already dictating', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true })
      );

      await dictationService.startDictation();

      expect(
        mockRecordingManager.startTranscriptionForDictation
      ).not.toHaveBeenCalled();
    });

    it('should not start if transitioning', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isTransitioning: true })
      );

      await dictationService.startDictation();

      expect(
        mockRecordingManager.startTranscriptionForDictation
      ).not.toHaveBeenCalled();
    });

    it('should not start if recording is in progress', async () => {
      mockRecordingManager.isRecording.mockReturnValue(true);

      await dictationService.startDictation();

      expect(
        mockRecordingManager.startTranscriptionForDictation
      ).not.toHaveBeenCalled();
    });

    it('should handle transcription start failure', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        false
      );

      await dictationService.startDictation();

      expect(mockTranscriptionService.offDictationText).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: false })
      );
      expect(mockDictationStatusWindow.updateStatus).not.toHaveBeenCalled();
    });

    it('should handle transcription start exception', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockRejectedValue(
        new Error('Start failed')
      );

      await expect(dictationService.startDictation()).rejects.toThrow(
        'Start failed'
      );

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: false })
      );
    });
  });

  describe('stopDictation', () => {
    it('should successfully stop dictation', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true })
      );

      await dictationService.stopDictation();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: true })
      );
      expect(mockDictationStatusWindow.updateStatus).toHaveBeenCalledWith(
        false
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'dictation-status',
        false
      );
      expect(
        mockRecordingManager.stopTranscriptionForDictation
      ).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: false })
      );
    });

    it('should not stop if not dictating', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: false })
      );

      await dictationService.stopDictation();

      expect(
        mockRecordingManager.stopTranscriptionForDictation
      ).not.toHaveBeenCalled();
    });

    it('should not stop if transitioning', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true, isTransitioning: true })
      );

      await dictationService.stopDictation();

      expect(
        mockRecordingManager.stopTranscriptionForDictation
      ).not.toHaveBeenCalled();
    });

    it('should cleanup transcription handler', async () => {
      // Start dictation first
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );
      await dictationService.startDictation();

      jest.advanceTimersByTime(400);

      // Now stop dictation
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true })
      );

      await dictationService.stopDictation();

      expect(mockTranscriptionService.offDictationText).toHaveBeenCalled();
    });

    it('should clear transitioning state even on error', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true })
      );
      mockRecordingManager.stopTranscriptionForDictation.mockResolvedValue(
        undefined
      );

      await dictationService.stopDictation();

      // Check that setTransitioning(false) was called
      const dispatchCalls = mockStore.dispatch.mock.calls;
      const clearTransitioningCall = dispatchCalls.find(
        (call: any[]) => call[0]?.payload === false
      );
      expect(clearTransitioningCall).toBeDefined();
    });
  });

  describe('handleDictationText', () => {
    it('should type text when dictating is active', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );

      await dictationService.startDictation();

      const handler = mockTranscriptionService.onDictationText.mock.calls[0][0];
      handler('test text');

      expect(robotjs.typeString).toHaveBeenCalledWith(' test text');
    });

    it('should not type text when dictating is not active', () => {
      const handler = (text: string) => {
        (dictationService as any).handleDictationText(text);
      };

      handler('test text');

      expect(robotjs.typeString).not.toHaveBeenCalled();
    });

    it('should handle typeString errors gracefully', async () => {
      (robotjs.typeString as jest.Mock).mockImplementation(() => {
        throw new Error('Type failed');
      });

      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );
      await dictationService.startDictation();

      const handler = mockTranscriptionService.onDictationText.mock.calls[0][0];

      expect(() => handler('test text')).not.toThrow();
    });
  });

  describe('handleDictationToggle', () => {
    it('should start dictation when not dictating', () => {
      (globalShortcut.register as jest.Mock).mockImplementation(
        (_shortcut, callback) => {
          callback();
          return true;
        }
      );

      const startSpy = jest
        .spyOn(dictationService, 'startDictation')
        .mockResolvedValue();

      dictationService.initialize();

      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop dictation when dictating', () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true })
      );

      (globalShortcut.register as jest.Mock).mockImplementation(
        (_shortcut, callback) => {
          callback();
          return true;
        }
      );

      const stopSpy = jest
        .spyOn(dictationService, 'stopDictation')
        .mockResolvedValue();

      dictationService.initialize();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should ignore toggle when transitioning', () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ isTransitioning: true })
      );

      (globalShortcut.register as jest.Mock).mockImplementation(
        (_shortcut, callback) => {
          callback();
          return true;
        }
      );

      const startSpy = jest.spyOn(dictationService, 'startDictation');
      const stopSpy = jest.spyOn(dictationService, 'stopDictation');

      dictationService.initialize();

      expect(startSpy).not.toHaveBeenCalled();
      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('isDictationActive', () => {
    it('should return false initially', () => {
      expect(dictationService.isDictationActive()).toBe(false);
    });

    it('should return true after starting dictation', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );

      await dictationService.startDictation();

      expect(dictationService.isDictationActive()).toBe(true);
    });

    it('should return false after stopping dictation', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );
      await dictationService.startDictation();

      mockStore.getState.mockReturnValue(
        createDefaultState({ isDictating: true })
      );

      await dictationService.stopDictation();

      expect(dictationService.isDictationActive()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should unregister shortcut', () => {
      dictationService.initialize();
      dictationService.cleanup();

      expect(globalShortcut.unregister).toHaveBeenCalled();
    });

    it('should stop dictation if active', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );
      await dictationService.startDictation();

      const stopSpy = jest.spyOn(dictationService, 'stopDictation');

      dictationService.cleanup();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should not stop dictation if not active', () => {
      const stopSpy = jest.spyOn(dictationService, 'stopDictation');

      dictationService.cleanup();

      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyDictationStatus', () => {
    it('should update status window and send to main window', async () => {
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );

      await dictationService.startDictation();
      jest.advanceTimersByTime(400);

      expect(mockDictationStatusWindow.updateStatus).toHaveBeenCalledWith(true);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'dictation-status',
        true
      );
    });

    it('should handle missing main window', async () => {
      (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([]);
      mockRecordingManager.startTranscriptionForDictation.mockResolvedValue(
        true
      );

      await dictationService.startDictation();
      jest.advanceTimersByTime(400);

      expect(mockDictationStatusWindow.updateStatus).toHaveBeenCalledWith(true);
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
