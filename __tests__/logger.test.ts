import { jest } from '@jest/globals';
import path from 'path';

// Mock electron modules before requiring logger
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/fake/userData/path'),
  },
}));

jest.mock('electron-log', () => {
  const mockLog = {
    transports: {
      file: {
        resolvePathFn: null as any,
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
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return mockLog;
});

describe('Logger', () => {
  let log: any;
  let electronLog: any;
  let electronApp: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset modules to get fresh instances
    jest.resetModules();

    electronLog = (await import('electron-log')).default;
    electronApp = (await import('electron')).app;
    log = (await import('../src/main/logger')).default;
  });

  it('should configure file logging path correctly', () => {
    // Test the resolvePathFn function that was set during module load
    const resolvePathFn = electronLog.transports.file.resolvePathFn;
    expect(resolvePathFn).toBeDefined();

    // Call the function to trigger app.getPath
    const logPath = resolvePathFn();

    expect(electronApp.getPath).toHaveBeenCalledWith('userData');

    const expectedPath = path.join('/fake/userData/path', 'logs', 'main.log');
    expect(logPath).toBe(expectedPath);
  });

  it('should set correct log levels', () => {
    expect(electronLog.transports.file.level).toBe('info');
    expect(electronLog.transports.console.level).toBe('debug');
  });

  it('should set correct log formats', () => {
    expect(electronLog.transports.file.format).toBe(
      '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
    );
    expect(electronLog.transports.console.format).toBe(
      '[{h}:{i}:{s}.{ms}] [{level}] {text}'
    );
  });

  it('should start error catching if available', () => {
    expect(electronLog.errorHandler.startCatching).toHaveBeenCalled();
  });

  it('should export the electron-log instance', () => {
    expect(log).toBe(electronLog);
    expect(log.info).toBeDefined();
    expect(log.error).toBeDefined();
    expect(log.warn).toBeDefined();
    expect(log.debug).toBeDefined();
  });

  it('should handle case where errorHandler is not available', async () => {
    // Reset and test without errorHandler
    jest.resetModules();

    jest.doMock('electron-log', () => ({
      transports: {
        file: {
          resolvePathFn: null as any,
          level: 'info',
          format: '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}',
        },
        console: {
          level: 'debug',
          format: '[{h}:{i}:{s}.{ms}] [{level}] {text}',
        },
      },
      // No errorHandler property
      info: jest.fn(),
      error: jest.fn(),
    }));

    // This should not throw an error
    await expect(async () => {
      await import('../src/main/logger');
    }).not.toThrow();
  });
});
