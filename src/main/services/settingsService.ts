import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../constants/dictationPrompts.js';
import type { PromptTemplate, SettingsSchema } from '../../types/common.js';
import { isNonEmptyString } from '../../utils/strings.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import { settingsStore, type SettingsStoreSchema } from '../settings-store.js';
import type { StateBroadcaster } from '../state-broadcaster.js';
import { updateSettings } from '../store/slices/settingsSlice.js';
import type { AppDispatch, RootState } from '../store/store.js';

@injectable()
export class SettingsService {
  constructor(
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.StateBroadcaster)
    private stateBroadcaster: StateBroadcaster
  ) {}

  initializeSettings(): void {
    try {
      const settings = this.getSettings();
      this.store.dispatch(updateSettings(settings));
      this.stateBroadcaster.settingsUpdated(settings);
    } catch (error: unknown) {
      this.logger.error('Failed to load settings:', error);
    }
  }

  getSettings(): SettingsSchema {
    return {
      assemblyaiKey: settingsStore.get('assemblyaiKey'),
      summaryPrompt:
        settingsStore.get('summaryPrompt') ||
        'Summarize the key points from this meeting transcript:',
      prompts: settingsStore.get('prompts'),
      autoStart: settingsStore.get('autoStart'),
      dictationStylingEnabled: settingsStore.get('dictationStylingEnabled'),
      dictationStylingPrompt:
        settingsStore.get('dictationStylingPrompt') ||
        DEFAULT_DICTATION_STYLING_PROMPT,
      dictationSilenceTimeout: settingsStore.get('dictationSilenceTimeout'),
      userId: settingsStore.get('userId'),
      microphoneGain: settingsStore.get('microphoneGain'),
      systemAudioGain: settingsStore.get('systemAudioGain'),
    };
  }

  /**
   * Generic getter for any setting key.
   * Returns the value from electron-store for the specified key.
   */
  getSetting<K extends keyof SettingsStoreSchema>(
    key: K
  ): SettingsStoreSchema[K] {
    return settingsStore.get(key);
  }

  updateSettings(updates: Partial<SettingsSchema>): void {
    this.logger.info('SettingsService.updateSettings called with:', updates);

    // Persist each setting to electron-store
    for (const [key, value] of Object.entries(updates)) {
      settingsStore.set(key as keyof SettingsStoreSchema, value);
    }

    // Update Redux store
    this.logger.info('Dispatching settings update to Redux:', updates);
    this.store.dispatch(updateSettings(updates));
    this.stateBroadcaster.settingsUpdated(updates);
  }

  getAssemblyAIKey(): string {
    return settingsStore.get('assemblyaiKey');
  }

  getSummaryPrompt(): string {
    return (
      settingsStore.get('summaryPrompt') ||
      'Summarize the key points from this meeting transcript:'
    );
  }

  isAutoStartEnabled(): boolean {
    return settingsStore.get('autoStart');
  }

  getPrompts(): { label: string; content: string }[] {
    const prompts: PromptTemplate[] = settingsStore.get('prompts');

    return prompts
      .filter(
        (p): p is { name: string; content: string } =>
          typeof p === 'object' && 'name' in p
      )
      .map((p) => ({
        label: p.name,
        content: p.content,
      }));
  }

  // Helper method to safely check if a setting has a non-empty trimmed value
  hasNonEmptySetting(key: keyof SettingsSchema): boolean {
    const value = settingsStore.get(key as keyof SettingsStoreSchema);
    return isNonEmptyString(value);
  }
}
