/**
 * Audio-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Base class for audio-related errors
 */
export class AudioError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    isOperational = true
  ) {
    super(message, code, isOperational);
  }
}

/**
 * Error thrown when microphone access is denied
 */
export class MicrophoneAccessDeniedError extends AudioError {
  constructor() {
    super(
      'Microphone access was denied. Please grant microphone permissions to use recording features.',
      ErrorCode.MICROPHONE_ACCESS_DENIED
    );
  }
}

/**
 * Error thrown when system audio capture is unavailable
 */
export class SystemAudioUnavailableError extends AudioError {
  constructor(reason?: string) {
    const message = reason
      ? `System audio capture is unavailable: ${reason}`
      : 'System audio capture is unavailable on this system';
    super(message, ErrorCode.SYSTEM_AUDIO_UNAVAILABLE);
  }
}

/**
 * Error thrown when audio processing fails
 */
export class AudioProcessingError extends AudioError {
  constructor(operation: string, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    super(
      `Audio processing failed during ${operation}: ${errorMessage}`,
      ErrorCode.AUDIO_PROCESSING_ERROR,
      false
    );
  }
}
