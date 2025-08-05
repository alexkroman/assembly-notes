/**
 * Central export point for all error classes
 */

// Base error classes and utilities
export * from './base.js';

// Domain-specific error classes
export * from './configuration.js';
export * from './recording.js';
export * from './transcription.js';
export * from './audio.js';
export * from './network.js';

// Error logging utilities
export { ErrorLogger } from './logger.js';

// Error serialization for IPC
export { serializeError, deserializeError } from './serialization.js';
