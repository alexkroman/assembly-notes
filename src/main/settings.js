const Store = require('electron-store');
const log = require('./logger.js');

const store = new Store({
  defaults: {
    assemblyaiKey: '',
    slackToken: '',
    slackChannel: '',
    customPrompt: '',
  },
  schema: {
    assemblyaiKey: {
      type: 'string',
      default: '',
    },
    slackToken: {
      type: 'string',
      default: '',
    },
    slackChannel: {
      type: 'string',
      default: '',
    },
    customPrompt: {
      type: 'string',
      default: '',
    },
  },
});

function loadSettings() {
  // No-op - electron-store handles loading automatically
}

function saveSettingsToFile(newSettings) {
  try {
    Object.keys(newSettings).forEach((key) => {
      store.set(key, newSettings[key]);
    });
  } catch (error) {
    log.error('Error saving settings:', error);
    throw error;
  }
}

function getSettings() {
  return store.store;
}

module.exports = { loadSettings, saveSettingsToFile, getSettings };
