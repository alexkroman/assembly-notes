import * as Sentry from '@sentry/electron/main';
import type { StreamingTranscriber } from 'assemblyai';
import { app } from 'electron';
import { inject, injectable } from 'tsyringe';

import { TranscriptionData } from '../../types/common.js';
import { DI_TOKENS } from '../di-tokens.js';
import logger from '../logger.js';

export interface TranscriptionConnection {
  microphone: StreamingTranscriber | null;
  system: StreamingTranscriber | null;
}

export interface TranscriptionCallbacks {
  onTranscript?: (data: TranscriptionData) => void;
  onError?: (stream: string, error: Error) => void;
  onConnectionStatus?: (stream: string, connected: boolean) => void;
}

// Abstract interfaces for better testability
export interface IAssemblyAIClient {
  streaming: {
    transcriber: (params: {
      sampleRate: number;
      encoding?: string;
      formatTurns?: boolean;
      endOfTurnConfidenceThreshold?: number;
      minEndOfTurnSilenceWhenConfident?: number;
      maxTurnSilence?: number;
    }) => StreamingTranscriber;
  };
}

export interface IAssemblyAIFactory {
  createClient(apiKey: string): Promise<IAssemblyAIClient>;
}

// Concrete implementation
export class AssemblyAIFactory implements IAssemblyAIFactory {
  async createClient(apiKey: string): Promise<IAssemblyAIClient> {
    // This will be mocked in tests
    const { AssemblyAI } = await import('assemblyai');
    return new AssemblyAI({ apiKey }) as unknown as IAssemblyAIClient;
  }
}

/**
 * Stateless transcription service that creates and manages AssemblyAI connections
 * All state management happens in Redux
 */
@injectable()
export class TranscriptionService {
  private dictationListeners: ((text: string) => void)[] = [];
  private speechActivityListeners: (() => void)[] = [];

  constructor(
    @inject(DI_TOKENS.AssemblyAIFactory)
    private assemblyAIFactory: IAssemblyAIFactory
  ) {}

  /**
   * Creates transcription connection for microphone only (used in dictation mode)
   */
  async createMicrophoneOnlyConnection(
    apiKey: string,
    callbacks: TranscriptionCallbacks
  ): Promise<TranscriptionConnection> {
    const aai = await this.assemblyAIFactory.createClient(apiKey);

    const microphoneTranscriber = await this.createTranscriber(
      aai,
      'microphone',
      callbacks
    );

    return {
      microphone: microphoneTranscriber,
      system: null,
    };
  }

  /**
   * Creates transcription connection for combined audio stream (microphone + system with echo cancellation)
   */
  async createCombinedConnection(
    apiKey: string,
    callbacks: TranscriptionCallbacks
  ): Promise<TranscriptionConnection> {
    const aai = await this.assemblyAIFactory.createClient(apiKey);

    // Create a single transcriber for the combined stream
    // We'll treat it as the "microphone" stream for compatibility
    const combinedTranscriber = await this.createTranscriber(
      aai,
      'microphone', // Use microphone as the stream type for the combined stream
      callbacks
    );

    logger.info(
      'Created combined audio stream transcriber with echo cancellation'
    );

    return {
      microphone: combinedTranscriber,
      system: null, // No separate system stream when using combined mode
    };
  }

  private async createTranscriber(
    aai: IAssemblyAIClient,
    streamType: 'microphone' | 'system',
    callbacks: TranscriptionCallbacks
  ): Promise<StreamingTranscriber> {
    const transcriber = aai.streaming.transcriber({
      sampleRate: 16000,
      encoding: 'pcm_s16le',
      // Enable turn formatting for better transcript structure
      formatTurns: true,
      // Adjust silence detection for meeting/dictation scenarios
      endOfTurnConfidenceThreshold: 0.8,
      minEndOfTurnSilenceWhenConfident: 1000, // 1 second of silence
      maxTurnSilence: 2000, // 2 seconds max silence before turn end
    });

    // Set up event handlers
    transcriber.on('open', () => {
      logger.info(`AssemblyAI ${streamType} connection opened`);
      callbacks.onConnectionStatus?.(streamType, true);
    });

    transcriber.on('error', (error: Error) => {
      // Log full error details for debugging
      logger.error(`AssemblyAI ${streamType} error:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        streamType,
      });

      // Check for connection reset errors
      if (
        error.message.includes('ERR_CONNECTION_RESET') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('WebSocket') ||
        error.message.includes('connection')
      ) {
        logger.info(`Attempting to handle connection error for ${streamType}`);

        // Notify about the error but don't crash
        callbacks.onError?.(
          streamType,
          new Error(
            `Connection lost for ${streamType} stream. It may reconnect automatically.`
          )
        );

        if (app.isPackaged) {
          Sentry.captureException(error, {
            level: 'warning',
            tags: {
              service: 'transcription',
              stream: streamType,
              errorType: 'connection_reset',
            },
            extra: {
              errorMessage: error.message,
            },
          });
        }
      } else {
        callbacks.onError?.(streamType, error);

        if (app.isPackaged) {
          Sentry.captureException(error, {
            tags: {
              service: 'transcription',
              stream: streamType,
            },
          });
        }
      }
    });

    transcriber.on('close', () => {
      logger.info(`AssemblyAI ${streamType} connection closed`);
      callbacks.onConnectionStatus?.(streamType, false);
    });

    transcriber.on('turn', (event) => {
      if (!event.transcript) return;

      // For partial turns, show any transcript (formatted or not) for real-time feedback
      // For final turns, only show formatted ones
      if (!event.end_of_turn) {
        // This is a partial - show it immediately for real-time feedback
        callbacks.onTranscript?.({
          streamType,
          text: event.transcript,
          partial: true,
        });
      } else if (event.turn_is_formatted) {
        // This is a final formatted turn - replace the partial with this
        callbacks.onTranscript?.({
          streamType,
          text: event.transcript,
          partial: false,
        });
      }
      // Ignore unformatted finals - we'll get the formatted version
    });

    // Connect with retry logic
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await transcriber.connect();
        logger.info(`AssemblyAI ${streamType} connected successfully`);
        return transcriber;
      } catch (error) {
        retryCount++;
        logger.error(
          `AssemblyAI ${streamType} connection attempt ${String(retryCount)} failed:`,
          error
        );

        if (retryCount >= maxRetries) {
          throw new Error(
            `Failed to connect ${streamType} after ${String(maxRetries)} attempts: ${String(error)}`
          );
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        logger.info(
          `Retrying ${streamType} connection in ${String(waitTime)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    return transcriber;
  }

  /**
   * Sends audio data to a transcriber
   */
  sendAudio(
    transcriber: StreamingTranscriber | null,
    audioData: ArrayBuffer
  ): void {
    if (!transcriber) return;

    try {
      const buffer = Buffer.from(audioData);
      transcriber.sendAudio(buffer.buffer);
    } catch (error) {
      // Silently ignore socket errors when connection is closed
      if (
        error instanceof Error &&
        error.message.includes('Socket is not open')
      ) {
        return;
      }
      logger.error('Error sending audio:', error);
      if (app.isPackaged) {
        Sentry.captureException(error, {
          tags: { service: 'transcription', operation: 'sendAudio' },
        });
      }
    }
  }

  /**
   * Sends keep-alive silence to maintain connection
   */
  sendKeepAlive(transcriber: StreamingTranscriber | null): void {
    if (!transcriber) return;

    const silenceBuffer = Buffer.alloc(1600 * 2);
    this.sendAudio(transcriber, silenceBuffer.buffer);
  }

  /**
   * Closes a transcriber connection
   */
  async closeTranscriber(
    transcriber: StreamingTranscriber | null
  ): Promise<void> {
    if (!transcriber) return;

    try {
      await transcriber.close();
    } catch (error) {
      logger.error('Error closing transcriber:', error);
      if (app.isPackaged) {
        Sentry.captureException(error, {
          tags: { service: 'transcription', operation: 'closeTranscriber' },
        });
      }
    }
  }

  /**
   * Closes all connections
   */
  async closeConnections(
    connections: Partial<TranscriptionConnection>
  ): Promise<void> {
    await Promise.allSettled([
      this.closeTranscriber(connections.microphone ?? null),
      this.closeTranscriber(connections.system ?? null),
    ]);
  }

  /**
   * Register a listener for dictation text
   */
  onDictationText(listener: (text: string) => void): void {
    this.dictationListeners.push(listener);
  }

  /**
   * Unregister a dictation text listener
   */
  offDictationText(listener: (text: string) => void): void {
    const index = this.dictationListeners.indexOf(listener);
    if (index > -1) {
      this.dictationListeners.splice(index, 1);
    }
  }

  /**
   * Emit dictation text to all listeners
   */
  emitDictationText(text: string): void {
    this.dictationListeners.forEach((listener) => {
      listener(text);
    });
  }

  /**
   * Register a listener for speech activity (any voice activity - partials or finals)
   */
  onSpeechActivity(listener: () => void): void {
    this.speechActivityListeners.push(listener);
  }

  /**
   * Unregister a speech activity listener
   */
  offSpeechActivity(listener: () => void): void {
    const index = this.speechActivityListeners.indexOf(listener);
    if (index > -1) {
      this.speechActivityListeners.splice(index, 1);
    }
  }

  /**
   * Emit speech activity to all listeners
   */
  emitSpeechActivity(): void {
    this.speechActivityListeners.forEach((listener) => {
      listener();
    });
  }
}
