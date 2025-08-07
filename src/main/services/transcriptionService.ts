import * as Sentry from '@sentry/electron/main';
import type { RealtimeTranscriber } from 'assemblyai';
import { app } from 'electron';
import { inject, injectable } from 'tsyringe';

import { TranscriptionData } from '../../types/common.js';
import { DI_TOKENS } from '../di-tokens.js';
import logger from '../logger.js';

export interface TranscriberConnection {
  transcriber: RealtimeTranscriber;
  stream: 'microphone' | 'system';
}

export interface TranscriptionConnection {
  microphone: RealtimeTranscriber | null;
  system: RealtimeTranscriber | null;
}

export interface TranscriptionCallbacks {
  onTranscript?: (data: TranscriptionData) => void;
  onError?: (stream: string, error: Error) => void;
  onConnectionStatus?: (stream: string, connected: boolean) => void;
}

// Abstract interfaces for better testability
export interface IAssemblyAIClient {
  realtime: {
    transcriber: (options: { sampleRate: number }) => RealtimeTranscriber;
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
    return new AssemblyAI({ apiKey }) as IAssemblyAIClient;
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
   * Creates transcription connections for both microphone and system audio
   */
  async createConnections(
    apiKey: string,
    callbacks: TranscriptionCallbacks
  ): Promise<TranscriptionConnection> {
    const aai = await this.assemblyAIFactory.createClient(apiKey);

    const [microphoneTranscriber, systemTranscriber] = await Promise.all([
      this.createTranscriber(aai, 'microphone', callbacks),
      this.createTranscriber(aai, 'system', callbacks),
    ]);

    return {
      microphone: microphoneTranscriber,
      system: systemTranscriber,
    };
  }

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

  private async createTranscriber(
    aai: IAssemblyAIClient,
    streamType: 'microphone' | 'system',
    callbacks: TranscriptionCallbacks
  ): Promise<RealtimeTranscriber> {
    const transcriber = aai.realtime.transcriber({
      sampleRate: 16000,
    });

    // Set up event handlers
    transcriber.on('open', () => {
      logger.info(`AssemblyAI ${streamType} connection opened`);
      callbacks.onConnectionStatus?.(streamType, true);
    });

    transcriber.on('error', (error: Error) => {
      logger.error(`AssemblyAI ${streamType} error:`, error);

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

    transcriber.on(
      'transcript',
      (transcript: { text: string; message_type: string }) => {
        if (!transcript.text) return;

        callbacks.onTranscript?.({
          streamType,
          text: transcript.text,
          partial: transcript.message_type !== 'FinalTranscript',
        });
      }
    );

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
    transcriber: RealtimeTranscriber | null,
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
  sendKeepAlive(transcriber: RealtimeTranscriber | null): void {
    if (!transcriber) return;

    const silenceBuffer = Buffer.alloc(1600 * 2);
    this.sendAudio(transcriber, silenceBuffer.buffer);
  }

  /**
   * Closes a transcriber connection
   */
  async closeTranscriber(
    transcriber: RealtimeTranscriber | null
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
