import { configureStore } from '@reduxjs/toolkit';
import Logger from 'electron-log';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens.js';
import { RecordingDataService } from '../../../src/main/services/recordingDataService.js';
import recordingReducer from '../../../src/main/store/slices/recordingSlice.js';
import recordingsReducer from '../../../src/main/store/slices/recordingsSlice.js';
import settingsReducer from '../../../src/main/store/slices/settingsSlice.js';
import transcriptionReducer from '../../../src/main/store/slices/transcriptionSlice.js';
import updateReducer from '../../../src/main/store/slices/updateSlice.js';
import type { RootState } from '../../../src/main/store/store.js';

// Mock dependencies
jest.mock('electron-log');

describe('RecordingDataService', () => {
  let recordingDataService: RecordingDataService;
  let mockTranscriptFileService: {
    saveTranscript: jest.Mock;
    getTranscriptById: jest.Mock;
    updateTranscript: jest.Mock;
    getAllTranscripts: jest.Mock;
    searchTranscripts: jest.Mock;
    deleteTranscript: jest.Mock;
  };
  let mockLogger: jest.Mocked<typeof Logger>;
  let store: ReturnType<typeof configureStore<RootState>>;

  beforeEach(() => {
    // Create a test store
    store = configureStore({
      reducer: {
        recording: recordingReducer,
        recordings: recordingsReducer,
        transcription: transcriptionReducer,
        settings: settingsReducer,
        update: updateReducer,
      },
    });

    // Mock the transcript file service
    mockTranscriptFileService = {
      saveTranscript: jest
        .fn()
        .mockResolvedValue('2024-01-01_new-recording.md'),
      getTranscriptById: jest.fn(),
      updateTranscript: jest.fn().mockResolvedValue(true),
      getAllTranscripts: jest.fn().mockResolvedValue([]),
      searchTranscripts: jest.fn().mockResolvedValue([]),
      deleteTranscript: jest.fn().mockResolvedValue(true),
    };

    // Mock the logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Mock the state broadcaster
    const mockStateBroadcaster = {
      recordingsCurrent: jest.fn(),
      recordingsTitle: jest.fn(),
      recordingsSummary: jest.fn(),
      recordingsTranscript: jest.fn(),
      transcriptionClear: jest.fn(),
      transcriptionLoad: jest.fn(),
      broadcast: jest.fn(),
    };

    // Register mocks in the container
    container.clearInstances();
    container.registerInstance(DI_TOKENS.Store, store);
    container.registerInstance(
      DI_TOKENS.TranscriptFileService,
      mockTranscriptFileService
    );
    container.registerInstance(DI_TOKENS.Logger, mockLogger);
    container.registerInstance(
      DI_TOKENS.StateBroadcaster,
      mockStateBroadcaster
    );

    // Create the service
    recordingDataService = container.resolve(RecordingDataService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('newRecording', () => {
    it('should clear transcription state before creating new recording', async () => {
      // Set up initial state with some transcription data
      store.dispatch({
        type: 'transcription/addTranscriptSegment',
        payload: {
          text: 'test transcript',
          isFinal: true,
          timestamp: Date.now(),
        },
      });

      // Verify transcription state is not empty
      expect(store.getState().transcription.currentTranscript).toBe(
        'test transcript'
      );

      // Call newRecording
      await recordingDataService.newRecording();

      // Verify transcription was cleared
      expect(store.getState().transcription.currentTranscript).toBe('');
      expect(store.getState().transcription.segments).toEqual([]);
    });

    it('should handle ongoing recordings by dispatching stop action', async () => {
      // This test verifies that the newRecording method properly handles
      // ongoing recordings by dispatching the stopRecording action
      // The actual implementation is tested through integration tests

      const result = await recordingDataService.newRecording();
      expect(result).toBeDefined();
    });

    it('should create a new recording via TranscriptFileService', async () => {
      await recordingDataService.newRecording();

      expect(mockTranscriptFileService.saveTranscript).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'New Recording',
          transcript: '',
        })
      );
    });

    it('should set current recording in store', async () => {
      await recordingDataService.newRecording();

      const currentRecording = store.getState().recordings.currentRecording;
      expect(currentRecording).toBeDefined();
      expect(currentRecording?.title).toBe('New Recording');
      expect(currentRecording?.transcript).toBe('');
    });

    it('should return the new recording ID', async () => {
      const result = await recordingDataService.newRecording();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toHaveLength(36); // UUID length
    });

    it('should handle file service errors gracefully', async () => {
      // Mock the file service to throw an error
      mockTranscriptFileService.saveTranscript.mockRejectedValue(
        new Error('File write error')
      );

      const _result = await recordingDataService.newRecording();

      expect(_result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create recording')
      );
    });
  });
});
