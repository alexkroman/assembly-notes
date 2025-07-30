import 'reflect-metadata';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Make jest available globally
Object.assign(globalThis, { jest });

// Mock console methods
if (globalThis.console) {
  Object.assign(globalThis.console, {
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  });
}

// Mock window.logger for all environments
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {} as any;
}

// Ensure window.logger exists
if (!(globalThis.window as any).logger) {
  (globalThis.window as any).logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// For jsdom environment, also set it on global.window
if (typeof global !== 'undefined') {
  global.window = global.window || {};
  (global.window as any).logger = (global.window as any).logger || {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}
