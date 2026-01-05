/**
 * Recording-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Error thrown when trying to perform an operation that requires an active recording
 */
export class NoActiveRecordingError extends AppError {
  constructor(operation = 'This operation') {
    super(
      `${operation} requires an active recording. Please create a new recording first.`,
      ErrorCode.NO_ACTIVE_RECORDING,
      true
    );
  }
}
