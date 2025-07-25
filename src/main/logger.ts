import path from 'path';

import { app } from 'electron';
import log from 'electron-log';

// Configure file logging
log.transports.file.resolvePathFn = () => {
  const logsPath = path.join(app.getPath('userData'), 'logs', 'main.log');
  return logsPath;
};

// Set log level (error, warn, info, verbose, debug, silly)
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Format logs
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

// Catch errors (different API in v4)
if (log.errorHandler) {
  log.errorHandler.startCatching();
}

export default log;
