/**
 * Standardized error logging utilities
 */

import { isAppError, getErrorMessage, getErrorCode } from './base.js';
import type Logger from '../main/logger.js';

/**
 * Error context for structured logging
 */
export interface ErrorContext {
  operation?: string;
  userId?: string;
  recordingId?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Standardized error logger
 */
export class ErrorLogger {
  constructor(private logger: typeof Logger) {}

  /**
   * Log an error with standardized format
   */
  logError(error: unknown, context?: ErrorContext): void {
    const errorInfo = this.formatError(error, context);

    if (this.isOperationalError(error)) {
      this.logger.warn('Operational error occurred:', errorInfo);
    } else {
      this.logger.error('System error occurred:', errorInfo);
    }
  }

  /**
   * Log error and rethrow
   */
  logAndThrow(error: unknown, context?: ErrorContext): never {
    this.logError(error, context);
    throw error;
  }

  /**
   * Format error for logging
   */
  private formatError(
    error: unknown,
    context?: ErrorContext
  ): Record<string, unknown> {
    const baseInfo: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      message: getErrorMessage(error),
      code: getErrorCode(error),
    };

    if (error instanceof Error) {
      baseInfo['name'] = error.name;
      baseInfo['stack'] = error.stack;
    }

    if (isAppError(error)) {
      baseInfo['isOperational'] = error.isOperational;
      baseInfo['errorDetails'] = error.toJSON();
    }

    if (context) {
      baseInfo['context'] = context;
    }

    return baseInfo;
  }

  /**
   * Check if error is operational (expected) vs programmer error
   */
  private isOperationalError(error: unknown): boolean {
    if (isAppError(error)) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Create a standardized error message for user display
   */
  getUserFriendlyMessage(error: unknown): string {
    if (isAppError(error) && error.isOperational) {
      return error.message;
    }

    // For non-operational errors, return a generic message
    return 'An unexpected error occurred. Please try again or contact support.';
  }
}
