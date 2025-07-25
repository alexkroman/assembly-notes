import Store from 'electron-store';
import log from './logger.js';

interface SettingsSchema {
  assemblyaiKey: string;
  customPrompt: string;
  keepAliveEnabled: boolean;
  keepAliveIntervalSeconds: number;
  summaryPrompt?: string;
}

const store = new Store<SettingsSchema>({
  defaults: {
    assemblyaiKey: '',
    customPrompt: '',
    keepAliveEnabled: true,
    keepAliveIntervalSeconds: 30,
  },
  schema: {
    assemblyaiKey: {
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

function loadSettings(): void {
  // No-op - electron-store handles loading automatically
}

function saveSettingsToFile(newSettings: Partial<SettingsSchema>): void {
  try {
    Object.keys(newSettings).forEach((key) => {
      (store as any).set(
        key as keyof SettingsSchema,
        (newSettings as any)[key]
      );
    });
  } catch (error) {
    log.error('Error saving settings:', error);
    throw error;
  }
}

function getSettings(): SettingsSchema {
  return (store as any).store;
}

export { loadSettings, saveSettingsToFile, getSettings };
