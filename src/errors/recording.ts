/**
 * Recording-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Base class for recording-related errors
 */
export class RecordingError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    isOperational = true
  ) {
    super(message, code, isOperational);
  }
}

/**
 * Error thrown when a recording is not found
 */
export class RecordingNotFoundError extends RecordingError {
  constructor(recordingId: string) {
    super(
      `Recording with ID "${recordingId}" was not found`,
      ErrorCode.RECORDING_NOT_FOUND
    );
  }
}

/**
 * Error thrown when trying to start a recording while one is already active
 */
export class RecordingAlreadyActiveError extends RecordingError {
  constructor() {
    super(
      'A recording is already in progress. Please stop the current recording before starting a new one.',
      ErrorCode.RECORDING_ALREADY_ACTIVE
    );
  }
}

/**
 * Error thrown when trying to perform an operation that requires an active recording
 */
export class NoActiveRecordingError extends RecordingError {
  constructor(operation = 'This operation') {
    super(
      `${operation} requires an active recording. Please create a new recording first.`,
      ErrorCode.NO_ACTIVE_RECORDING
    );
  }
}

/**
 * Error thrown when recording save operation fails
 */
export class RecordingSaveError extends RecordingError {
  constructor(reason?: string) {
    const message = reason
      ? `Failed to save recording: ${reason}`
      : 'Failed to save recording';
    super(message, ErrorCode.RECORDING_SAVE_FAILED, false);
  }
}
