/**
 * Base error classes for Assembly Notes application
 * Provides structured error handling with proper inheritance
 */

/**
 * Base class for all custom errors in the application
 */
export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    isOperational = true,
    stack?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Convert error to a JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }
}

/**
 * Error codes enum for consistent error identification
 */
export enum ErrorCode {
  // Configuration errors
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Recording errors
  RECORDING_NOT_FOUND = 'RECORDING_NOT_FOUND',
  RECORDING_ALREADY_ACTIVE = 'RECORDING_ALREADY_ACTIVE',
  NO_ACTIVE_RECORDING = 'NO_ACTIVE_RECORDING',
  RECORDING_SAVE_FAILED = 'RECORDING_SAVE_FAILED',

  // Transcription errors
  TRANSCRIPTION_CONNECTION_FAILED = 'TRANSCRIPTION_CONNECTION_FAILED',
  TRANSCRIPTION_STREAM_ERROR = 'TRANSCRIPTION_STREAM_ERROR',
  TRANSCRIPTION_TIMEOUT = 'TRANSCRIPTION_TIMEOUT',

  // Audio errors
  MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
  SYSTEM_AUDIO_UNAVAILABLE = 'SYSTEM_AUDIO_UNAVAILABLE',
  AUDIO_PROCESSING_ERROR = 'AUDIO_PROCESSING_ERROR',

  // Database errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DATABASE_MIGRATION_FAILED = 'DATABASE_MIGRATION_FAILED',

  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',

  // Update errors
  UPDATE_CHECK_FAILED = 'UPDATE_CHECK_FAILED',
  UPDATE_DOWNLOAD_FAILED = 'UPDATE_DOWNLOAD_FAILED',

  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

/**
 * Helper to determine if an error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Helper to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Helper to safely extract error code
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return ErrorCode.UNKNOWN_ERROR;
}
