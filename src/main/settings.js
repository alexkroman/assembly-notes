const Store = require('electron-store').default || require('electron-store');
const log = require('./logger.js');

const store = new Store({
  defaults: {
    assemblyaiKey: '',
    slackToken: '',
    slackChannel: '',
    customPrompt: '',
    keepAliveEnabled: true,
    keepAliveIntervalSeconds: 30,
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
    keepAliveEnabled: {
      type: 'boolean',
      default: true,
    },
    keepAliveIntervalSeconds: {
      type: 'number',
      default: 30,
      minimum: 10,
      maximum: 300,
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
