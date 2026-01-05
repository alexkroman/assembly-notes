import crypto from 'crypto';

import { safeStorage } from 'electron';
import Store from 'electron-store';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../constants/dictationPrompts.js';
import type { PromptTemplate } from '../types/common.js';

// Settings store schema - assemblyaiKey stored encrypted
export interface SettingsStoreSchema {
  assemblyaiKeyEncrypted: string; // Base64-encoded encrypted key
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
    assemblyaiKeyEncrypted: '',
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

/**
 * Encrypt a string using Electron's safeStorage (OS keychain)
 */
function encryptString(value: string): string {
  if (!value) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: store as-is if encryption unavailable (rare)
    return value;
  }
  const encrypted = safeStorage.encryptString(value);
  return encrypted.toString('base64');
}

/**
 * Decrypt a string using Electron's safeStorage
 */
function decryptString(encryptedBase64: string): string {
  if (!encryptedBase64) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: assume it's plain text
    return encryptedBase64;
  }
  try {
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(encrypted);
  } catch {
    // If decryption fails, it might be plain text from old version
    return encryptedBase64;
  }
}

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

  /**
   * Get the decrypted AssemblyAI API key
   */
  getAssemblyAIKey(): string {
    const encrypted = store.get('assemblyaiKeyEncrypted');
    return decryptString(encrypted);
  },

  /**
   * Set the AssemblyAI API key (encrypts before storing)
   */
  setAssemblyAIKey(apiKey: string): void {
    const encrypted = encryptString(apiKey);
    store.set('assemblyaiKeyEncrypted', encrypted);
  },
};

// Ensure userId exists (for fresh installs)
if (!settingsStore.get('userId')) {
  settingsStore.set('userId', crypto.randomUUID());
}

// Migrate plain text API key to encrypted (one-time migration)
// Check for old 'assemblyaiKey' field and migrate it
const rawStore = store.store as unknown as Record<string, unknown>;
if (
  rawStore['assemblyaiKey'] &&
  typeof rawStore['assemblyaiKey'] === 'string'
) {
  const plainKey = rawStore['assemblyaiKey'];
  if (plainKey) {
    settingsStore.setAssemblyAIKey(plainKey);
  }
  // Remove the old plain text key
  delete rawStore['assemblyaiKey'];
  store.store = rawStore as unknown as SettingsStoreSchema;
}
