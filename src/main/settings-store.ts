import crypto from 'crypto';

import Store from 'electron-store';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../constants/prompts.js';
import type { PromptTemplate } from '../types/common.js';

// Settings store schema
export interface SettingsStoreSchema {
  assemblyaiKey: string;
  summaryPrompt: string;
  prompts: PromptTemplate[];
  autoStart: boolean;
  userId: string;
  dictationStylingPrompt: string;
  microphoneGain: number;
  systemAudioGain: number;
  migrationCompleted: boolean;
}

// Create the store instance with defaults
const store = new Store<SettingsStoreSchema>({
  name: 'config',
  defaults: {
    assemblyaiKey: '',
    summaryPrompt: 'Summarize the key points from this meeting transcript:',
    prompts: [],
    autoStart: false,
    userId: crypto.randomUUID(),
    dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
    microphoneGain: 1.0,
    systemAudioGain: 0.7,
    migrationCompleted: false,
  },
});

// Settings store wrapper with type-safe methods
export const settingsStore = {
  get<K extends keyof SettingsStoreSchema>(key: K): SettingsStoreSchema[K] {
    return store.get(key);
  },

  set<K extends keyof SettingsStoreSchema>(
    key: K,
    value: SettingsStoreSchema[K]
  ): void {
    store.set(key, value);
  },

  getAll(): SettingsStoreSchema {
    return store.store;
  },
};

// Ensure userId exists (for fresh installs)
if (!settingsStore.get('userId')) {
  settingsStore.set('userId', crypto.randomUUID());
}

// Migrate encrypted API key back to plain text (one-time migration)
const rawStore = store.store as unknown as Record<string, unknown>;
if (
  rawStore['assemblyaiKeyEncrypted'] &&
  typeof rawStore['assemblyaiKeyEncrypted'] === 'string'
) {
  // The encrypted key can't be decrypted without safeStorage, so just clear it
  // Users will need to re-enter their API key
  delete rawStore['assemblyaiKeyEncrypted'];
  store.store = rawStore as unknown as SettingsStoreSchema;
}
