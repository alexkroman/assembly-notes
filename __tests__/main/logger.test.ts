import { jest } from '@jest/globals';

describe('Logger', () => {
  let log: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Import the logger module (uses mocked dependencies)
    log = (await import('../../src/main/logger')).default;
  });

  it('should provide logging methods', () => {
    expect(log.info).toBeDefined();
    expect(log.error).toBeDefined();
    expect(log.warn).toBeDefined();
    expect(log.debug).toBeDefined();
  });

  it('should be callable', () => {
    expect(() => {
      log.info('test message');
      log.error('test error');
      log.warn('test warning');
      log.debug('test debug');
    }).not.toThrow();
  });
});
