import * as Sentry from '@sentry/electron/main';
import type { RealtimeTranscriber } from 'assemblyai';
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
      callbacks.onConnectionStatus?.(streamType, true);
    });

    transcriber.on('error', (error: Error) => {
      callbacks.onError?.(streamType, error);
    });

    transcriber.on('close', () => {
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

    await transcriber.connect();
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
      Sentry.captureException(error, {
        tags: { service: 'transcription', operation: 'sendAudio' },
      });
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
      Sentry.captureException(error, {
        tags: { service: 'transcription', operation: 'closeTranscriber' },
      });
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
}
