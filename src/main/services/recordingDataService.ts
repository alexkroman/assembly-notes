import crypto from 'crypto';

import 'reflect-metadata';
import { Store } from '@reduxjs/toolkit';
import Logger from 'electron-log';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import type { StateBroadcaster } from '../state-broadcaster.js';
import type { PostHogService } from './posthogService.js';
import { TranscriptFileService } from './transcriptFileService.js';
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
    @inject(DI_TOKENS.TranscriptFileService)
    private transcriptFileService: TranscriptFileService,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.StateBroadcaster)
    private stateBroadcaster: StateBroadcaster,
    @inject(DI_TOKENS.PostHogService)
    private posthog: PostHogService
  ) {}

  async newRecording(): Promise<string | null> {
    const title = 'New Recording';

    // Clear existing transcription state first
    this.store.dispatch(clearTranscription());
    this.stateBroadcaster.transcriptionClear();

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

    const recordingId = crypto.randomUUID();
    const timestamp = Date.now();

    try {
      // Create the recording object
      const newRecording = {
        id: recordingId,
        title,
        transcript: '',
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Save to markdown file
      const filename =
        await this.transcriptFileService.saveTranscript(newRecording);

      // Store filename for future updates
      const recordingWithFilename = {
        ...newRecording,
        filename,
      };

      this.store.dispatch(setCurrentRecording(recordingWithFilename));
      this.stateBroadcaster.recordingsCurrent(recordingWithFilename);
      this.logger.info(`Created new recording with ID: ${recordingId}`);
      return recordingId;
    } catch (error) {
      this.logger.error(`Failed to create recording: ${String(error)}`);
      this.posthog.trackError(error, {
        service: 'RecordingDataService',
        operation: 'newRecording',
      });
      return null;
    }
  }

  async loadRecording(recordingId: string): Promise<boolean> {
    try {
      const recording =
        await this.transcriptFileService.getTranscriptById(recordingId);
      if (!recording) {
        this.logger.warn(`Recording ${recordingId} not found`);
        return false;
      }

      this.store.dispatch(setCurrentRecording(recording));
      this.stateBroadcaster.recordingsCurrent(recording);

      if (recording.transcript) {
        this.store.dispatch(loadExistingTranscript(recording.transcript));
        this.stateBroadcaster.transcriptionLoad(recording.transcript);
      } else {
        this.store.dispatch(clearTranscription());
        this.stateBroadcaster.transcriptionClear();
      }

      this.logger.info(`Loaded recording: ${recordingId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to load recording ${recordingId}: ${String(error)}`
      );
      this.posthog.trackError(error, {
        service: 'RecordingDataService',
        operation: 'loadRecording',
        recordingId,
      });
      return false;
    }
  }

  async saveCurrentTranscription(): Promise<void> {
    const state = this.store.getState();
    const currentRecording = state.recordings.currentRecording;
    const currentRecordingId = currentRecording?.id;
    const transcription = state.transcription.currentTranscript;

    if (!currentRecordingId) {
      this.logger.warn('No current recording to save');
      return;
    }

    const fullTranscript = transcription;

    try {
      await this.transcriptFileService.updateTranscript(currentRecordingId, {
        transcript: fullTranscript,
      });
      // Update the current recording in the store with the new transcript
      this.store.dispatch(updateCurrentRecordingTranscript(fullTranscript));
      this.stateBroadcaster.recordingsTranscript(fullTranscript);
    } catch (error) {
      this.logger.error(`Failed to save transcript: ${String(error)}`);
      this.posthog.trackError(error, {
        service: 'RecordingDataService',
        operation: 'saveCurrentTranscription',
      });
    }
  }

  async saveSummary(recordingId: string, summary: string): Promise<void> {
    try {
      await this.transcriptFileService.updateTranscript(recordingId, {
        summary,
      });

      // Only update Redux if this is for the current recording
      const currentRecordingId =
        this.store.getState().recordings.currentRecording?.id;
      if (currentRecordingId === recordingId) {
        this.store.dispatch(updateCurrentRecordingSummary(summary));
        this.stateBroadcaster.recordingsSummary(summary);
      }

      this.logger.info(`Saved summary for recording: ${recordingId}`);
    } catch (error) {
      this.logger.error(`Failed to save summary: ${String(error)}`);
      this.posthog.trackError(error, {
        service: 'RecordingDataService',
        operation: 'saveSummary',
        recordingId,
      });
    }
  }

  async getRecordingTranscript(recordingId: string): Promise<string | null> {
    try {
      const recording =
        await this.transcriptFileService.getTranscriptById(recordingId);
      return recording?.transcript ?? null;
    } catch (error) {
      this.logger.error(`Failed to get recording transcript: ${String(error)}`);
      this.posthog.trackError(error, {
        service: 'RecordingDataService',
        operation: 'getRecordingTranscript',
        recordingId,
      });
      return null;
    }
  }

  async updateAudioFilename(
    recordingId: string,
    audioFilename: string
  ): Promise<void> {
    try {
      await this.transcriptFileService.updateTranscript(recordingId, {
        audio_filename: audioFilename,
      });
      this.logger.info(`Updated audio filename for recording: ${recordingId}`);
    } catch (error) {
      this.logger.error(`Failed to update audio filename: ${String(error)}`);
      this.posthog.trackError(error, {
        service: 'RecordingDataService',
        operation: 'updateAudioFilename',
        recordingId,
      });
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
