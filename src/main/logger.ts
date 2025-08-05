import path from 'path';

import * as Sentry from '@sentry/electron/main';
import { app } from 'electron';
import log from 'electron-log';

log.transports.file.resolvePathFn = () => {
  const logsPath = path.join(app.getPath('userData'), 'logs', 'main.log');
  return logsPath;
};

// Only log errors in production, full logging in development
const isProduction = app.isPackaged;
log.transports.file.level = isProduction ? 'error' : 'info';
log.transports.console.level = isProduction ? 'error' : 'debug';

log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (log.errorHandler) {
  log.errorHandler.startCatching();
}

// Hook electron-log errors to Sentry
log.hooks.push((message, transport) => {
  if (transport !== log.transports.console && message.level === 'error') {
    const error = message.data[0] as unknown;
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), 'error');
    }
  }
  return message;
});

export default log;
