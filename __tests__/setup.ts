import { jest } from '@jest/globals';

// Global test setup
(global as any).console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};