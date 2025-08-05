/**
 * Error serialization utilities for IPC communication
 */

import { ErrorCode, isAppError } from './base.js';

/**
 * Serialized error format for IPC
 */
export interface SerializedError {
  name: string;
  message: string;
  code: string;
  stack?: string;
  isOperational?: boolean;
  timestamp?: string;
}

/**
 * Serialize an error for IPC transmission
 */
export function serializeError(error: unknown): SerializedError {
  if (isAppError(error)) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
      code: error.code,
      isOperational: error.isOperational,
      timestamp: error.timestamp.toISOString(),
    };
    if (error.stack) {
      serialized.stack = error.stack;
    }
    return serialized;
  }

  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
      code: ErrorCode.UNKNOWN_ERROR,
    };
    if (error.stack) {
      serialized.stack = error.stack;
    }
    return serialized;
  }

  return {
    name: 'UnknownError',
    message: String(error),
    code: ErrorCode.UNKNOWN_ERROR,
  };
}

/**
 * Deserialize an error from IPC
 */
export function deserializeError(serialized: SerializedError): Error {
  // Try to reconstruct the appropriate error type based on code
  const error = new Error(serialized.message);
  error.name = serialized.name;

  if (serialized.stack) {
    error.stack = serialized.stack;
  }

  // Add custom properties
  Object.defineProperty(error, 'code', {
    value: serialized.code,
    enumerable: true,
  });

  if (serialized.isOperational !== undefined) {
    Object.defineProperty(error, 'isOperational', {
      value: serialized.isOperational,
      enumerable: true,
    });
  }

  if (serialized.timestamp) {
    Object.defineProperty(error, 'timestamp', {
      value: new Date(serialized.timestamp),
      enumerable: true,
    });
  }

  return error;
}
