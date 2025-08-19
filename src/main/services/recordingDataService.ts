import 'reflect-metadata';
import { Store } from '@reduxjs/toolkit';
import Logger from 'electron-log';
import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import { DatabaseService } from '../database.js';
import { DI_TOKENS } from '../di-tokens.js';
import { stopRecording } from '../store/slices/recordingSlice.js';
import {
  setCurrentRecording,
  updateCurrentRecordingSummary,
  updateCurrentRecordingTranscript,
} from '../store/slices/recordingsSlice.js';
import {
  loadExistingTranscript,
  clearTranscription,
} from '../store/slices/transcriptionSlice.js';
import { RootState, AppDispatch } from '../store/store.js';

@injectable()
export class RecordingDataService {
  constructor(
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.DatabaseService) private database: DatabaseService,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger
  ) {}

  async newRecording(): Promise<string | null> {
    const title = 'New Recording';

    // Clear existing transcription state first
    this.store.dispatch(clearTranscription());

    // Check if there's an ongoing recording and stop it
    const state = this.store.getState();
    if (
      state.recording.status === 'recording' ||
      state.recording.status === 'starting'
    ) {
      this.logger.info('Stopping ongoing recording before creating new one');
      await this.store.dispatch(stopRecording());

      // Wait for the recording to actually stop
      await this.waitForRecordingToStop();
    }

    const recordingId = uuidv4();
    const timestamp = Date.now();

    try {
      this.database.createRecording({
        id: recordingId,
        title,
        timestamp,
        summary: null,
        transcript: '',
      });

      // Create the recording object that matches the Recording type
      const newRecording = {
        id: recordingId,
        title,
        transcript: '',
        created_at: timestamp,
        updated_at: timestamp,
      };

      this.store.dispatch(setCurrentRecording(newRecording));
      this.logger.info(`Created new recording with ID: ${recordingId}`);
      return recordingId;
    } catch (error) {
      this.logger.error(`Failed to create recording: ${String(error)}`);
      return null;
    }
  }

  loadRecording(recordingId: string): boolean {
    try {
      const recording = this.database.getRecordingById(recordingId);
      if (!recording) {
        this.logger.warn(`Recording ${recordingId} not found`);
        return false;
      }

      this.store.dispatch(setCurrentRecording(recording));

      if (recording.transcript) {
        this.store.dispatch(loadExistingTranscript(recording.transcript));
      } else {
        this.store.dispatch(clearTranscription());
      }

      this.logger.info(`Loaded recording: ${recordingId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to load recording ${recordingId}: ${String(error)}`
      );
      return false;
    }
  }

  saveCurrentTranscription(): void {
    const state = this.store.getState();
    const currentRecordingId = state.recordings.currentRecording?.id;
    const transcription = state.transcription.currentTranscript;

    if (!currentRecordingId) {
      this.logger.warn('No current recording to save');
      return;
    }

    const fullTranscript = transcription;

    try {
      this.database.updateRecordingTranscript(
        currentRecordingId,
        fullTranscript
      );
      // Update the current recording in the store with the new transcript
      this.store.dispatch(updateCurrentRecordingTranscript(fullTranscript));
    } catch (error) {
      this.logger.error(`Failed to save transcript: ${String(error)}`);
    }
  }

  saveSummary(recordingId: string, summary: string): void {
    try {
      this.database.updateRecordingSummary(recordingId, summary);

      // Only update Redux if this is for the current recording
      const currentRecordingId =
        this.store.getState().recordings.currentRecording?.id;
      if (currentRecordingId === recordingId) {
        this.store.dispatch(updateCurrentRecordingSummary(summary));
      }

      this.logger.info(`Saved summary for recording: ${recordingId}`);
    } catch (error) {
      this.logger.error(`Failed to save summary: ${String(error)}`);
    }
  }

  getRecordingTranscript(recordingId: string): string | null {
    try {
      const recording = this.database.getRecordingById(recordingId);
      return recording?.transcript ?? null;
    } catch (error) {
      this.logger.error(`Failed to get recording transcript: ${String(error)}`);
      return null;
    }
  }

  updateAudioFilename(recordingId: string, audioFilename: string): void {
    try {
      this.database.updateRecordingAudioFilename(recordingId, audioFilename);
      this.logger.info(`Updated audio filename for recording: ${recordingId}`);
    } catch (error) {
      this.logger.error(`Failed to update audio filename: ${String(error)}`);
    }
  }

  private async waitForRecordingToStop(): Promise<void> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const state = this.store.getState();
        if (state.recording.status === 'idle') {
          resolve();
        } else {
          // Check again in 50ms
          setTimeout(checkStatus, 50);
        }
      };

      // Start checking immediately
      checkStatus();

      // Set a timeout to prevent infinite waiting
      setTimeout(() => {
        this.logger.warn('Timeout waiting for recording to stop');
        resolve();
      }, 5000); // 5 second timeout
    });
  }
}
