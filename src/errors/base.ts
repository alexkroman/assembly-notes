/**
 * Base error classes for Assembly Notes application
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
 * Error codes for consistent error identification
 */
export enum ErrorCode {
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_CONFIG = 'INVALID_CONFIG',
  NO_ACTIVE_RECORDING = 'NO_ACTIVE_RECORDING',
  TRANSCRIPTION_CONNECTION_FAILED = 'TRANSCRIPTION_CONNECTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
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
