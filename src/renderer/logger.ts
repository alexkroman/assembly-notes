/* eslint-disable no-console, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unnecessary-condition */
const hasLoggerBridge = typeof window !== 'undefined' && 'logger' in window;

function send(level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]) {
  if (hasLoggerBridge) {
    (window.logger[level] as (...a: unknown[]) => void)(...args);
  } else {
    // Fallback to browser console
    const consoleMap: Record<
      'info' | 'warn' | 'error' | 'debug',
      (...a: unknown[]) => void
    > = {
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug
        ? console.debug.bind(console)
        : console.log.bind(console),
    };
    consoleMap[level](...args);
  }
}

export const logger = {
  info: (...args: unknown[]) => send('info', ...args),
  warn: (...args: unknown[]) => send('warn', ...args),
  error: (...args: unknown[]) => send('error', ...args),
  debug: (...args: unknown[]) => send('debug', ...args),
};
