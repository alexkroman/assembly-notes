import path from 'path';

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

export default log;
