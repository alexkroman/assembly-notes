const hasLoggerBridge = typeof window !== 'undefined' && 'logger' in window;

function send(level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]) {
  if (hasLoggerBridge) {
    // @ts-expect-error logger is bridged in preload
    window.logger[level](...args);
  } else {
    // eslint-disable-next-line no-console
    console[level](...args);
  }
}

export const logger = {
  info: (...args: unknown[]) => send('info', ...args),
  warn: (...args: unknown[]) => send('warn', ...args),
  error: (...args: unknown[]) => send('error', ...args),
  debug: (...args: unknown[]) => send('debug', ...args),
};