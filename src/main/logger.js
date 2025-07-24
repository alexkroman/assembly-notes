const log = require('electron-log');
const { app } = require('electron');
const path = require('path');

// Configure file logging
log.transports.file.resolvePath = () => {
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
if (log.catchErrors) {
  log.catchErrors();
}

module.exports = log;
