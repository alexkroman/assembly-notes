/**
 * Configuration-related error classes
 */

import { AppError, ErrorCode } from './base.js';

/**
 * Error thrown when required configuration is missing
 */
export class ConfigurationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.INVALID_CONFIG) {
    super(message, code, true);
  }
}

/**
 * Error thrown when AssemblyAI API key is missing or invalid
 */
export class MissingApiKeyError extends ConfigurationError {
  constructor(service = 'AssemblyAI') {
    super(
      `${service} API key is not configured. Please add it in settings.`,
      ErrorCode.MISSING_API_KEY
    );
  }
}
