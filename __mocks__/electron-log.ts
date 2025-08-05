const mockLog = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  transports: {
    file: {
      level: 'info',
      format: '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}',
      resolvePathFn: jest.fn(),
      getFile: jest.fn(),
    },
    console: {
      level: 'debug',
      format: '[{h}:{i}:{s}.{ms}] [{level}] {text}',
    },
  },
  hooks: [],
  catchErrors: jest.fn(),
  initialize: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
};

// Support both named and default exports
export default mockLog;
export const info = mockLog.info;
export const warn = mockLog.warn;
export const error = mockLog.error;
export const debug = mockLog.debug;
export const transports = mockLog.transports;
export const hooks = mockLog.hooks;
