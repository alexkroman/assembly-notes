import type { BrowserWindow } from 'electron';
import Logger from 'electron-log';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../src/main/di-tokens.js';
import { StateBroadcaster } from '../../src/main/state-broadcaster.js';
import { IPC_STATE_CHANNELS } from '../../src/types/ipc-events.js';

// Mock dependencies
jest.mock('electron-log');

describe('StateBroadcaster', () => {
  let broadcaster: StateBroadcaster;
  let mockMainWindow: jest.Mocked<BrowserWindow>;
  let mockLogger: jest.Mocked<typeof Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock BrowserWindow
    mockMainWindow = {
      isDestroyed: jest.fn().mockReturnValue(false),
      webContents: {
        send: jest.fn(),
      },
    } as unknown as jest.Mocked<BrowserWindow>;

    // Mock logger
    mockLogger = Logger as jest.Mocked<typeof Logger>;

    // Register mocks in container
    container.registerInstance(DI_TOKENS.MainWindow, mockMainWindow);
    container.registerInstance(DI_TOKENS.Logger, mockLogger);

    // Create broadcaster instance
    broadcaster = container.resolve(StateBroadcaster);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('broadcast', () => {
    it('should send message to renderer via IPC', () => {
      broadcaster.broadcast(IPC_STATE_CHANNELS.RECORDING_STATUS, {
        status: 'idle',
      });

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        IPC_STATE_CHANNELS.RECORDING_STATUS,
        { status: 'idle' }
      );
    });

    it('should log warning and not send when window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      broadcaster.broadcast(IPC_STATE_CHANNELS.RECORDING_STATUS, {
        status: 'idle',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Cannot broadcast ${IPC_STATE_CHANNELS.RECORDING_STATUS}: window is destroyed`
      );
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('Recording State', () => {
    describe('recordingStatus', () => {
      it('should broadcast status only', () => {
        broadcaster.recordingStatus('recording');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_STATUS,
          { status: 'recording' }
        );
      });

      it('should broadcast status with options', () => {
        broadcaster.recordingStatus('recording', {
          recordingId: 'test-123',
          startTime: 1234567890,
        });

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_STATUS,
          {
            status: 'recording',
            recordingId: 'test-123',
            startTime: 1234567890,
          }
        );
      });

      it('should broadcast error status', () => {
        broadcaster.recordingStatus('error', {
          error: 'Something went wrong',
        });

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_STATUS,
          {
            status: 'error',
            error: 'Something went wrong',
          }
        );
      });
    });

    describe('recordingConnection', () => {
      it('should broadcast microphone connection', () => {
        broadcaster.recordingConnection('microphone', true);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_CONNECTION,
          { stream: 'microphone', connected: true }
        );
      });

      it('should broadcast system disconnection', () => {
        broadcaster.recordingConnection('system', false);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_CONNECTION,
          { stream: 'system', connected: false }
        );
      });
    });

    describe('recordingError', () => {
      it('should broadcast error message', () => {
        broadcaster.recordingError('Connection failed');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_ERROR,
          { error: 'Connection failed' }
        );
      });
    });

    describe('recordingDictation', () => {
      it('should broadcast dictation mode on', () => {
        broadcaster.recordingDictation(true);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_DICTATION,
          { isDictating: true }
        );
      });

      it('should broadcast dictation mode off', () => {
        broadcaster.recordingDictation(false);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_DICTATION,
          { isDictating: false }
        );
      });
    });

    describe('recordingTransitioning', () => {
      it('should broadcast transitioning state', () => {
        broadcaster.recordingTransitioning(true);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_TRANSITIONING,
          { isTransitioning: true }
        );
      });
    });

    describe('recordingReset', () => {
      it('should broadcast reset', () => {
        broadcaster.recordingReset();

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDING_RESET,
          {}
        );
      });
    });
  });

  describe('Transcription State', () => {
    describe('transcriptionSegment', () => {
      it('should broadcast transcript segment', () => {
        const segment = {
          text: 'Hello world',
          timestamp: 1000,
          isFinal: true,
          source: 'microphone' as const,
        };

        broadcaster.transcriptionSegment(segment);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.TRANSCRIPTION_SEGMENT,
          segment
        );
      });
    });

    describe('transcriptionBuffer', () => {
      it('should broadcast microphone buffer', () => {
        broadcaster.transcriptionBuffer('microphone', 'partial text...');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.TRANSCRIPTION_BUFFER,
          { source: 'microphone', text: 'partial text...' }
        );
      });

      it('should broadcast system buffer', () => {
        broadcaster.transcriptionBuffer('system', 'system audio text');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.TRANSCRIPTION_BUFFER,
          { source: 'system', text: 'system audio text' }
        );
      });
    });

    describe('transcriptionError', () => {
      it('should broadcast transcription error', () => {
        broadcaster.transcriptionError('Transcription service unavailable');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.TRANSCRIPTION_ERROR,
          { error: 'Transcription service unavailable' }
        );
      });
    });

    describe('transcriptionClear', () => {
      it('should broadcast clear', () => {
        broadcaster.transcriptionClear();

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.TRANSCRIPTION_CLEAR,
          {}
        );
      });
    });

    describe('transcriptionLoad', () => {
      it('should broadcast loaded transcript', () => {
        broadcaster.transcriptionLoad('Existing transcript content');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.TRANSCRIPTION_LOAD,
          { transcript: 'Existing transcript content' }
        );
      });
    });
  });

  describe('Settings State', () => {
    describe('settingsUpdated', () => {
      it('should broadcast settings update', () => {
        const settings = {
          assemblyaiKey: 'new-key',
          autoStart: true,
        };

        broadcaster.settingsUpdated(settings);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.SETTINGS_UPDATED,
          settings
        );
      });

      it('should broadcast partial settings update', () => {
        broadcaster.settingsUpdated({ summaryPrompt: 'New prompt' });

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.SETTINGS_UPDATED,
          { summaryPrompt: 'New prompt' }
        );
      });
    });
  });

  describe('Update State', () => {
    describe('updateChecking', () => {
      it('should broadcast checking state', () => {
        broadcaster.updateChecking();

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_CHECKING,
          {}
        );
      });
    });

    describe('updateAvailable', () => {
      it('should broadcast available update info', () => {
        const updateInfo = {
          version: '2.0.0',
          files: [],
          path: '/update/path',
          sha512: 'abc123',
          releaseDate: '2024-01-15',
        };

        broadcaster.updateAvailable(updateInfo);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_AVAILABLE,
          { updateInfo }
        );
      });
    });

    describe('updateNotAvailable', () => {
      it('should broadcast not available', () => {
        broadcaster.updateNotAvailable();

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_NOT_AVAILABLE,
          {}
        );
      });
    });

    describe('updateDownloading', () => {
      it('should broadcast downloading state', () => {
        broadcaster.updateDownloading();

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_DOWNLOADING,
          {}
        );
      });
    });

    describe('updateProgress', () => {
      it('should broadcast download progress', () => {
        broadcaster.updateProgress(75);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_PROGRESS,
          { percent: 75 }
        );
      });

      it('should broadcast complete progress', () => {
        broadcaster.updateProgress(100);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_PROGRESS,
          { percent: 100 }
        );
      });
    });

    describe('updateDownloaded', () => {
      it('should broadcast downloaded update info', () => {
        const updateInfo = {
          version: '2.0.0',
          files: [],
          path: '/update/path',
          sha512: 'abc123',
          releaseDate: '2024-01-15',
        };

        broadcaster.updateDownloaded(updateInfo);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_DOWNLOADED,
          { updateInfo }
        );
      });
    });

    describe('updateError', () => {
      it('should broadcast update error', () => {
        broadcaster.updateError('Download failed');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_ERROR,
          { error: 'Download failed' }
        );
      });
    });

    describe('updateReset', () => {
      it('should broadcast reset', () => {
        broadcaster.updateReset();

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.UPDATE_RESET,
          {}
        );
      });
    });
  });

  describe('Recordings State', () => {
    describe('recordingsCurrent', () => {
      it('should broadcast current recording', () => {
        const recording = {
          id: 'rec-123',
          title: 'Test Recording',
          transcript: 'Hello',
          summary: 'Summary',
          created_at: 1234567890,
          updated_at: 1234567890,
        };

        broadcaster.recordingsCurrent(recording);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDINGS_CURRENT,
          { recording }
        );
      });

      it('should broadcast null recording', () => {
        broadcaster.recordingsCurrent(null);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDINGS_CURRENT,
          { recording: null }
        );
      });
    });

    describe('recordingsTitle', () => {
      it('should broadcast title update', () => {
        broadcaster.recordingsTitle('New Meeting Title');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDINGS_TITLE,
          { title: 'New Meeting Title' }
        );
      });
    });

    describe('recordingsSummary', () => {
      it('should broadcast summary update', () => {
        broadcaster.recordingsSummary('AI-generated summary');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDINGS_SUMMARY,
          { summary: 'AI-generated summary' }
        );
      });
    });

    describe('recordingsTranscript', () => {
      it('should broadcast transcript update', () => {
        broadcaster.recordingsTranscript('Full transcript text');

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          IPC_STATE_CHANNELS.RECORDINGS_TRANSCRIPT,
          { transcript: 'Full transcript text' }
        );
      });
    });
  });
});
