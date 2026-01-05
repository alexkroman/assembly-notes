import type { Store } from '@reduxjs/toolkit';
import type { BrowserWindow } from 'electron';
import { inject, injectable } from 'tsyringe';

import {
  MissingApiKeyError,
  NoActiveRecordingError,
  TranscriptionConnectionError,
  ErrorLogger,
} from '../../errors/index.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import type { StateBroadcaster } from '../state-broadcaster.js';
import { AudioRecordingService } from './audioRecordingService.js';
import type { PostHogService } from './posthogService.js';
import { RecordingDataService } from './recordingDataService.js';
import { SummarizationService } from './summarizationService.js';
import {
  TranscriptionService,
  type TranscriptionConnection,
} from './transcriptionService.js';
import {
  setRecordingError,
  startRecording,
  startDictation,
  stopRecording,
  stopDictation,
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
  private errorLogger: ErrorLogger;

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
    private summarizationService: SummarizationService,
    @inject(DI_TOKENS.AudioRecordingService)
    private audioRecordingService: AudioRecordingService,
    @inject(DI_TOKENS.StateBroadcaster)
    private stateBroadcaster: StateBroadcaster,
    @inject(DI_TOKENS.PostHogService)
    private posthog: PostHogService
  ) {
    this.errorLogger = new ErrorLogger(this.logger);
    this.setupStoreSubscriptions();
  }

  /**
   * Handles transcription errors uniformly for both dictation and meeting modes.
   * Connection resets are logged as warnings; critical errors stop recording.
   */
  private handleTranscriptionError(
    stream: string,
    error: unknown,
    mode: 'dictation' | 'meeting'
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a connection reset - these can be temporary
    const isConnectionReset =
      errorMessage.includes('Connection lost') ||
      errorMessage.includes('ERR_CONNECTION_RESET') ||
      errorMessage.includes('ECONNRESET');

    if (isConnectionReset) {
      const modePrefix = mode === 'dictation' ? 'Dictation ' : '';
      this.logger.warn(
        `${modePrefix}${stream} stream connection reset - may reconnect automatically`
      );

      const reconnectMsg =
        mode === 'dictation'
          ? 'Dictation connection interrupted. Attempting to reconnect...'
          : `${stream === 'microphone' ? 'Microphone' : 'System audio'} connection interrupted. Attempting to reconnect...`;

      this.store.dispatch(setRecordingError(reconnectMsg));
      this.stateBroadcaster.recordingError(reconnectMsg);
      return;
    }

    const transcriptionError = new TranscriptionConnectionError(
      stream as 'microphone' | 'system',
      errorMessage
    );

    this.errorLogger.logError(transcriptionError, {
      operation:
        mode === 'dictation' ? 'dictationTranscription' : 'transcription',
      component: 'RecordingManager',
      ...(mode === 'meeting' && { metadata: { stream } }),
    });

    // Track error to PostHog
    this.posthog.trackError(transcriptionError, {
      service: 'RecordingManager',
      operation: 'transcription',
      stream,
      mode,
      fatal: false,
    });

    const userFriendlyMsg =
      this.errorLogger.getUserFriendlyMessage(transcriptionError);
    this.store.dispatch(setRecordingError(userFriendlyMsg));
    this.stateBroadcaster.recordingError(userFriendlyMsg);

    // Check if it's a critical error that requires stopping (meeting mode only)
    if (
      mode === 'meeting' &&
      error instanceof Error &&
      (error.message.includes('Not authorized') ||
        error.message.includes('Invalid API key') ||
        error.message.includes('Forbidden'))
    ) {
      // Track fatal error
      this.posthog.trackError(error, {
        service: 'RecordingManager',
        operation: 'transcription',
        stream,
        mode,
        fatal: true,
        reason: 'authorization_failure',
      });
      void this.store.dispatch(stopRecording());
    }
  }

  /**
   * Handles connection status updates uniformly.
   */
  private handleConnectionStatus(stream: string, connected: boolean): void {
    this.store.dispatch(
      updateConnectionStatus({
        stream: stream as 'microphone' | 'system',
        connected,
      })
    );
    this.stateBroadcaster.recordingConnection(
      stream as 'microphone' | 'system',
      connected
    );
  }

  private setupStoreSubscriptions(): void {
    let lastConnectionStatus = {
      microphone: false,
      system: false,
    };

    // Subscribe to Redux store changes
    this.store.subscribe(() => {
      const state = this.store.getState();
      const { connectionStatus, status, isDictating } = state.recording;

      // In dictation mode or combined stream mode (which we always use for meetings),
      // only check microphone connection
      const connectionsReady =
        connectionStatus.microphone && !lastConnectionStatus.microphone;

      if (connectionsReady) {
        const modeDescription = isDictating
          ? 'Microphone'
          : 'Combined audio stream';
        this.logger.info(
          `RecordingManager: ${modeDescription} connections established, starting audio capture`
        );
        this.mainWindow.webContents.send('start-audio-capture');
      }

      // Check if we're stopping - always just check microphone since we use combined stream
      const wasPreviouslyConnected = lastConnectionStatus.microphone;

      if (status === 'idle' && wasPreviouslyConnected) {
        this.logger.info(
          'RecordingManager: Connections closed, stopping audio capture'
        );
        this.mainWindow.webContents.send('stop-audio-capture');
        this.mainWindow.webContents.send('reset-audio-processing');
      }

      lastConnectionStatus = { ...connectionStatus };
    });
  }

  isRecording(): boolean {
    const state = this.store.getState();
    return state.recording.status === 'recording';
  }

  async startTranscriptionForDictation(): Promise<boolean> {
    try {
      // Use proper Redux action for dictation
      const result = await this.store.dispatch(startDictation());

      if (startDictation.rejected.match(result)) {
        return false;
      }

      // Get API key from state
      const state = this.store.getState();
      const apiKey = state.settings.assemblyaiKey;

      if (!apiKey) {
        const error = new MissingApiKeyError();
        this.errorLogger.logError(error, {
          operation: 'startTranscriptionForDictation',
          component: 'RecordingManager',
        });
        this.store.dispatch(setRecordingError(error.message));
        this.stateBroadcaster.recordingError(error.message);
        return false;
      }

      // Create microphone-only connection for dictation mode
      this.connections =
        await this.transcriptionService.createMicrophoneOnlyConnection(apiKey, {
          onTranscript: (data) => {
            // Emit speech activity for ANY transcript (partial or final) in dictation mode
            this.transcriptionService.emitSpeechActivity();

            // In dictation mode, only emit final transcripts for insertion
            if (!data.partial && data.streamType === 'microphone') {
              this.transcriptionService.emitDictationText(data.text);
            }
            // Don't process partials or store transcripts in dictation mode
          },
          onError: (stream: string, error: unknown) => {
            this.handleTranscriptionError(stream, error, 'dictation');
          },
          onConnectionStatus: (stream: string, connected: boolean) => {
            this.handleConnectionStatus(stream, connected);
          },
        });

      // Start keep-alive interval
      this.startKeepAliveInterval();

      return true;
    } catch (error) {
      this.errorLogger.logError(error as Error, {
        operation: 'startTranscriptionForDictation',
        component: 'RecordingManager',
      });
      const errorMsg = this.errorLogger.getUserFriendlyMessage(error);
      this.store.dispatch(setRecordingError(errorMsg));
      this.stateBroadcaster.recordingError(errorMsg);
      return false;
    }
  }

  async startTranscription(): Promise<boolean> {
    try {
      // MUST have a current recording from database before starting
      const currentState = this.store.getState();
      if (!currentState.recordings.currentRecording?.id) {
        const error = new NoActiveRecordingError('Starting transcription');
        this.errorLogger.logError(error, {
          operation: 'startTranscription',
          component: 'RecordingManager',
        });
        this.store.dispatch(setRecordingError(error.message));
        this.stateBroadcaster.recordingError(error.message);
        return false;
      }

      // Now dispatch the Redux action to set state to "starting"
      await this.store.dispatch(startRecording());
      // Broadcast 'starting' status to renderer
      this.stateBroadcaster.recordingStatus('starting', {
        recordingId: currentState.recordings.currentRecording.id,
      });

      // Get API key from state
      const state = this.store.getState();
      const apiKey = state.settings.assemblyaiKey;

      if (!apiKey) {
        const error = new MissingApiKeyError();
        this.errorLogger.logError(error, {
          operation: 'startTranscription',
          component: 'RecordingManager',
        });
        this.store.dispatch(setRecordingError(error.message));
        this.stateBroadcaster.recordingError(error.message);
        return false;
      }

      // Create connections with callbacks that dispatch Redux actions
      // Always use combined connection for meeting transcription (refactored pipeline)
      this.connections =
        await this.transcriptionService.createCombinedConnection(apiKey, {
          onTranscript: (data) => {
            // Check if we're in dictation mode via the DictationService
            const isDictating = this.store.getState().recording.isDictating;

            if (isDictating) {
              // Emit speech activity for ANY transcript (partial or final) in dictation mode
              this.transcriptionService.emitSpeechActivity();

              // In dictation mode, only emit final transcripts for insertion
              // Only emit from microphone stream to avoid duplicates
              if (!data.partial && data.streamType === 'microphone') {
                this.transcriptionService.emitDictationText(data.text);
              }
              // Don't process partials or store transcripts in dictation mode
              return;
            }

            // Normal transcription mode
            if (data.partial) {
              // Handle partial transcripts - update buffer for immediate UI display
              this.store.dispatch(
                updateTranscriptBuffer({
                  source: data.streamType,
                  text: data.text,
                })
              );
              this.stateBroadcaster.transcriptionBuffer(
                data.streamType,
                data.text
              );
            } else {
              // Handle final transcripts - add to segments and clear buffers
              const segment = {
                text: data.text,
                timestamp: Date.now(),
                isFinal: true,
                source: data.streamType,
              };
              this.store.dispatch(addTranscriptSegment(segment));
              this.stateBroadcaster.transcriptionSegment(segment);
              // Clear the buffer for this source since we now have the final transcript
              this.store.dispatch(
                updateTranscriptBuffer({
                  source: data.streamType,
                  text: '',
                })
              );
              this.stateBroadcaster.transcriptionBuffer(data.streamType, '');
              // Auto-save transcript after receiving final transcript
              void this.recordingDataService.saveCurrentTranscription();
            }
          },
          onError: (stream: string, error: unknown) => {
            this.handleTranscriptionError(stream, error, 'meeting');
          },
          onConnectionStatus: (stream: string, connected: boolean) => {
            this.handleConnectionStatus(stream, connected);
          },
        });

      // Log the mode being used
      this.logger.info('Using combined audio stream with echo cancellation');

      // Start keep-alive interval
      this.startKeepAliveInterval();

      // Start audio recording
      const recordingId = currentState.recordings.currentRecording.id;
      this.audioRecordingService.startRecording(recordingId);

      // Broadcast 'recording' status to renderer - transcription is now active
      this.stateBroadcaster.recordingStatus('recording', {
        recordingId,
        startTime: Date.now(),
      });

      return true;
    } catch (error) {
      const recordingId = this.store.getState().recordings.currentRecording?.id;
      this.errorLogger.logError(error, {
        operation: 'startTranscription',
        component: 'RecordingManager',
        ...(recordingId && { recordingId }),
      });

      const errorMsg = this.errorLogger.getUserFriendlyMessage(error);
      this.store.dispatch(setRecordingError(errorMsg));
      this.stateBroadcaster.recordingError(errorMsg);
      return false;
    }
  }

  async stopTranscription(): Promise<boolean> {
    try {
      // Broadcast 'stopping' status to renderer
      this.stateBroadcaster.recordingStatus('stopping');

      // Save current transcription before stopping
      void this.recordingDataService.saveCurrentTranscription();

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

      // Stop audio recording and save the file
      const currentRecording =
        this.store.getState().recordings.currentRecording;
      if (currentRecording?.id) {
        // Pass the transcript filename so audio file uses the same naming pattern
        const transcriptFilename = (currentRecording as { filename?: string })
          .filename;
        const audioFilename = await this.audioRecordingService.stopRecording(
          currentRecording.id,
          transcriptFilename
        );
        if (audioFilename) {
          // Update the recording with the audio filename
          void this.recordingDataService.updateAudioFilename(
            currentRecording.id,
            audioFilename
          );
        }
      }

      await this.store.dispatch(stopRecording());
      // Broadcast 'idle' status to renderer - recording has stopped
      this.stateBroadcaster.recordingStatus('idle');
      return true;
    } catch (error) {
      this.logger.error('Failed to stop recording:', error);
      this.posthog.trackError(error, {
        service: 'RecordingManager',
        operation: 'stopRecording',
        fatal: false,
      });
      // Broadcast error status
      this.stateBroadcaster.recordingStatus('error', {
        error: 'Failed to stop recording',
      });
      return false;
    }
  }

  async stopTranscriptionForDictation(): Promise<boolean> {
    try {
      // Use proper Redux action for stopping dictation
      const result = await this.store.dispatch(stopDictation());

      if (stopDictation.rejected.match(result)) {
        return false;
      }

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

      return true;
    } catch (error) {
      this.logger.error('Failed to stop dictation:', error);
      this.posthog.trackError(error, {
        service: 'RecordingManager',
        operation: 'stopDictation',
        fatal: false,
      });
      return false;
    }
  }

  sendMicrophoneAudio(audioData: ArrayBuffer): void {
    const state = this.store.getState();

    // Only send audio if we have an active connection
    if (this.connections.microphone) {
      this.transcriptionService.sendAudio(
        this.connections.microphone,
        audioData
      );
    }

    // Save audio data for recording
    const recordingId = state.recordings.currentRecording?.id;
    if (recordingId && state.recording.status === 'recording') {
      // All audio comes through combined stream for meetings
      this.audioRecordingService.appendAudioData(
        recordingId,
        audioData,
        'combined'
      );
    }
  }

  sendSystemAudio(_audioData: ArrayBuffer): void {
    // System audio is already mixed in the combined stream, so we don't process it separately
    // This method is kept for backward compatibility but does nothing
    return;
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

        // Send summary to UI with recording ID - UI will validate and handle both state update and database write
        this.mainWindow.webContents.send('summary', {
          text: summary,
          recordingId: currentRecordingId,
        });

        // Save to database and update Redux state via RecordingDataService
        if (currentRecordingId) {
          this.logger.info(
            `Saving summary for recording: ${currentRecordingId}`
          );
          void this.recordingDataService.saveSummary(
            currentRecordingId,
            summary
          );
        }
      }

      this.mainWindow.webContents.send('summarization-completed');
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error during summarization: ${errorMessage}`);
      this.posthog.trackError(err, {
        service: 'RecordingManager',
        operation: 'summarizeTranscript',
        fatal: false,
      });
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
