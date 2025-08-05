/**
 * Transcription-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Base class for transcription-related errors
 */
export class TranscriptionError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    isOperational = true
  ) {
    super(message, code, isOperational);
  }
}

/**
 * Error thrown when transcription connection fails
 */
export class TranscriptionConnectionError extends TranscriptionError {
  constructor(stream: 'microphone' | 'system', reason?: string) {
    const message = reason
      ? `Failed to connect ${stream} transcription stream: ${reason}`
      : `Failed to connect ${stream} transcription stream`;
    super(message, ErrorCode.TRANSCRIPTION_CONNECTION_FAILED);
  }
}

/**
 * Error thrown when transcription stream encounters an error
 */
export class TranscriptionStreamError extends TranscriptionError {
  constructor(stream: 'microphone' | 'system', error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    super(
      `Transcription stream error (${stream}): ${errorMessage}`,
      ErrorCode.TRANSCRIPTION_STREAM_ERROR
    );
  }
}

/**
 * Error thrown when transcription times out
 */
export class TranscriptionTimeoutError extends TranscriptionError {
  constructor(timeoutMs: number) {
    super(
      `Transcription connection timed out after ${String(timeoutMs)}ms`,
      ErrorCode.TRANSCRIPTION_TIMEOUT
    );
  }
}
