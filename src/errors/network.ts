/**
 * Network-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Base class for network-related errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    isOperational = true
  ) {
    super(message, code, isOperational);
  }
}

/**
 * Error thrown when a network request times out
 */
export class NetworkTimeoutError extends NetworkError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Network timeout during ${operation} after ${String(timeoutMs)}ms`,
      ErrorCode.NETWORK_TIMEOUT
    );
  }
}

/**
 * Error thrown when network is unavailable
 */
export class NetworkUnavailableError extends NetworkError {
  constructor(operation?: string) {
    const message = operation
      ? `Network unavailable for ${operation}`
      : 'Network connection is unavailable';
    super(message, ErrorCode.NETWORK_UNAVAILABLE);
  }
}
