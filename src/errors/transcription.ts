/**
 * Transcription-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Error thrown when transcription connection fails
 */
export class TranscriptionConnectionError extends AppError {
  constructor(stream: 'microphone' | 'system', reason?: string) {
    const message = reason
      ? `Failed to connect ${stream} transcription stream: ${reason}`
      : `Failed to connect ${stream} transcription stream`;
    super(message, ErrorCode.TRANSCRIPTION_CONNECTION_FAILED, true);
  }
}
