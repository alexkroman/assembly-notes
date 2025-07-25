import { jest } from '@jest/globals';

const mockLog = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  transports: {
    file: {
      resolvePathFn: jest.fn(),
      level: 'info',
      format: '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}',
    },
    console: {
      level: 'debug',
      format: '[{h}:{i}:{s}.{ms}] [{level}] {text}',
    },
  },
  errorHandler: {
    startCatching: jest.fn(),
  },
};

export default mockLog;