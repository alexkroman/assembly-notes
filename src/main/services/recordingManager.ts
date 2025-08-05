import type { Store } from '@reduxjs/toolkit';
import type { BrowserWindow } from 'electron';
import { inject, injectable } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import { RecordingDataService } from './recordingDataService.js';
import { SummarizationService } from './summarizationService.js';
import {
  TranscriptionService,
  type TranscriptionConnection,
} from './transcriptionService.js';
import {
  setRecordingError,
  startRecording,
  stopRecording,
  updateConnectionStatus,
} from '../store/slices/recordingSlice.js';
import {
  addTranscriptSegment,
  updateTranscriptBuffer,
} from '../store/slices/transcriptionSlice.js';
import { AppDispatch, RootState } from '../store/store.js';

@injectable()
export class RecordingManager {
  private connections: TranscriptionConnection = {
    microphone: null,
    system: null,
  };
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow,
    @inject(DI_TOKENS.RecordingDataService)
    private recordingDataService: RecordingDataService,
    @inject(DI_TOKENS.TranscriptionService)
    private transcriptionService: TranscriptionService,
    @inject(DI_TOKENS.SummarizationService)
    private summarizationService: SummarizationService
  ) {
    this.setupStoreSubscriptions();
  }

  private setupStoreSubscriptions(): void {
    let lastConnectionStatus = {
      microphone: false,
      system: false,
    };

    // Subscribe to Redux store changes
    this.store.subscribe(() => {
      const state = this.store.getState();
      const { connectionStatus, status } = state.recording;

      // Check if both connections are established
      if (
        connectionStatus.microphone &&
        connectionStatus.system &&
        (!lastConnectionStatus.microphone || !lastConnectionStatus.system)
      ) {
        this.logger.info(
          'RecordingManager: Both connections established, starting audio capture'
        );
        this.mainWindow.webContents.send('start-audio-capture');
      }

      // Check if we're stopping
      if (
        status === 'idle' &&
        lastConnectionStatus.microphone &&
        lastConnectionStatus.system
      ) {
        this.logger.info(
          'RecordingManager: Connections closed, stopping audio capture'
        );
        this.mainWindow.webContents.send('stop-audio-capture');
        this.mainWindow.webContents.send('reset-audio-processing');
      }

      lastConnectionStatus = { ...connectionStatus };
    });
  }

  async startTranscription(): Promise<boolean> {
    try {
      // MUST have a current recording from database before starting
      const currentState = this.store.getState();
      if (!currentState.recordings.currentRecording?.id) {
        this.store.dispatch(
          setRecordingError(
            'No recording selected. Please create a new recording first.'
          )
        );
        return false;
      }

      // Now dispatch the Redux action to set state to "starting"
      await this.store.dispatch(startRecording());

      // Get API key from state
      const state = this.store.getState();
      const apiKey = state.settings.assemblyaiKey;

      if (!apiKey) {
        this.store.dispatch(
          setRecordingError(
            'AssemblyAI API Key is not set. Please add it in settings.'
          )
        );
        return false;
      }

      // Create connections with callbacks that dispatch Redux actions
      this.connections = await this.transcriptionService.createConnections(
        apiKey,
        {
          onTranscript: (data) => {
            if (data.partial) {
              // Handle partial transcripts - update buffer for immediate UI display
              this.store.dispatch(
                updateTranscriptBuffer({
                  source: data.streamType,
                  text: data.text,
                })
              );
            } else {
              // Handle final transcripts - add to segments and clear buffers
              this.store.dispatch(
                addTranscriptSegment({
                  text: data.text,
                  timestamp: Date.now(),
                  isFinal: true,
                  source: data.streamType,
                })
              );
              // Clear the buffer for this source since we now have the final transcript
              this.store.dispatch(
                updateTranscriptBuffer({
                  source: data.streamType,
                  text: '',
                })
              );
              // Auto-save transcript after receiving final transcript
              this.recordingDataService.saveCurrentTranscription();
            }
          },
          onError: (stream: string, error: unknown) => {
            const errorMessage =
              error instanceof Error
                ? `${stream.charAt(0).toUpperCase() + stream.slice(1)} Error: ${error.message}`
                : `${stream.charAt(0).toUpperCase() + stream.slice(1)} Error: Unknown error`;
            this.store.dispatch(setRecordingError(errorMessage));

            // Check if it's a critical error
            if (
              error instanceof Error &&
              (error.message.includes('Not authorized') ||
                error.message.includes('Invalid API key') ||
                error.message.includes('Forbidden'))
            ) {
              void this.store.dispatch(stopRecording());
            }
          },
          onConnectionStatus: (stream: string, connected: boolean) => {
            this.store.dispatch(
              updateConnectionStatus({
                stream: stream as 'microphone' | 'system',
                connected,
              })
            );
          },
        }
      );

      // Start keep-alive interval
      this.startKeepAliveInterval();

      return true;
    } catch (error) {
      this.logger.error('Failed to start recording:', error);
      this.store.dispatch(
        setRecordingError(
          error instanceof Error ? error.message : 'Failed to start recording'
        )
      );
      return false;
    }
  }

  async stopTranscription(): Promise<boolean> {
    try {
      // Save current transcription before stopping
      this.recordingDataService.saveCurrentTranscription();

      // Clear keep-alive interval
      this.stopKeepAliveInterval();

      // FIRST: Stop audio capture to prevent more audio from being sent
      this.mainWindow.webContents.send('stop-audio-capture');

      // Give a brief moment for any pending audio to clear
      await new Promise((resolve) => setTimeout(resolve, 100));

      // SECOND: Close connections while they still exist
      if (this.connections.microphone || this.connections.system) {
        await this.transcriptionService.closeConnections(this.connections);
      }

      // THIRD: Clear local connections after closing
      this.connections = { microphone: null, system: null };

      await this.store.dispatch(stopRecording());
      return true;
    } catch (error) {
      this.logger.error('Failed to stop recording:', error);
      return false;
    }
  }

  sendMicrophoneAudio(audioData: ArrayBuffer): void {
    // Only send audio if we have an active connection
    if (this.connections.microphone) {
      this.transcriptionService.sendAudio(
        this.connections.microphone,
        audioData
      );
    }
  }

  sendSystemAudio(audioData: ArrayBuffer): void {
    // Only send audio if we have an active connection
    if (this.connections.system) {
      this.transcriptionService.sendAudio(this.connections.system, audioData);
    }
  }

  async summarizeTranscript(transcript?: string): Promise<boolean> {
    // Get current recording and transcript from state
    const state = this.store.getState();
    const currentTranscript =
      transcript ?? state.transcription.currentTranscript;
    // Single source of truth: currentRecording.id from state
    const currentRecordingId = state.recordings.currentRecording?.id;

    // Debug logging
    this.logger.info(
      `Summarization debug - currentRecording.id: ${String(currentRecordingId)}`
    );

    if (!currentTranscript.trim()) {
      this.logger.warn('No transcript available for summarization');
      return false;
    }

    try {
      this.mainWindow.webContents.send('summarization-started');

      const settings = state.settings;
      const summaryPrompt = settings.summaryPrompt;
      const apiKey = settings.assemblyaiKey;

      if (!apiKey) {
        throw new Error('AssemblyAI API key not available');
      }

      const summary = await this.summarizationService.summarizeTranscript(
        currentTranscript,
        summaryPrompt,
        apiKey
      );

      if (summary) {
        this.logger.info(
          `Summarization complete - sending summary event for recording: ${String(currentRecordingId)}`
        );

        // Send summary to UI - UI will handle both state update and database write
        this.mainWindow.webContents.send('summary', {
          text: summary,
        });

        // Save to database and update Redux state via RecordingDataService
        if (currentRecordingId) {
          this.logger.info(
            `Saving summary for recording: ${currentRecordingId}`
          );
          this.recordingDataService.saveSummary(currentRecordingId, summary);
        }
      }

      this.mainWindow.webContents.send('summarization-completed');
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error during summarization: ${errorMessage}`);
      this.mainWindow.webContents.send('summarization-completed');
      return false;
    }
  }

  private startKeepAliveInterval(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      const microphone = this.connections.microphone;
      const system = this.connections.system;
      if (microphone) {
        this.transcriptionService.sendKeepAlive(microphone);
      }
      if (system) {
        this.transcriptionService.sendKeepAlive(system);
      }
    }, 30000);
  }

  private stopKeepAliveInterval(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  cleanup(): void {
    this.stopKeepAliveInterval();
  }
}
