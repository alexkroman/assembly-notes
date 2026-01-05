import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../constants/dictationPrompts.js';
import type { SettingsSchema } from '../../types/common.js';
import type { DatabaseService } from '../database.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import type { StateBroadcaster } from '../state-broadcaster.js';
import { updateSettings } from '../store/slices/settingsSlice.js';
import type { AppDispatch, RootState } from '../store/store.js';

@injectable()
export class SettingsService {
  constructor(
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.DatabaseService) private databaseService: DatabaseService,
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
    const dbSettings = this.databaseService.getSettings();

    return {
      assemblyaiKey: dbSettings.assemblyaiKey,
      summaryPrompt: dbSettings.summaryPrompt,
      prompts: dbSettings.prompts,
      autoStart: dbSettings.autoStart,
      dictationStylingEnabled: dbSettings.dictationStylingEnabled || false,
      dictationStylingPrompt:
        dbSettings.dictationStylingPrompt || DEFAULT_DICTATION_STYLING_PROMPT,
      dictationSilenceTimeout: dbSettings.dictationSilenceTimeout || 2000,
    };
  }

  /**
   * Generic getter for any setting key.
   * Returns the value from the database for the specified key.
   */
  getSetting<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
    const settings = this.databaseService.getSettings();
    return settings[key];
  }

  updateSettings(updates: Partial<SettingsSchema>): void {
    this.logger.info('SettingsService.updateSettings called with:', updates);

    // Persist each setting to the database
    for (const [key, value] of Object.entries(updates)) {
      this.databaseService.setSetting(key, value);
    }

    // Update Redux store
    this.logger.info('Dispatching settings update to Redux:', updates);
    this.store.dispatch(updateSettings(updates));
    this.stateBroadcaster.settingsUpdated(updates);
  }

  getAssemblyAIKey(): string {
    return this.getSetting('assemblyaiKey');
  }

  getSummaryPrompt(): string {
    return (
      this.getSetting('summaryPrompt') ||
      'Summarize the key points from this meeting transcript:'
    );
  }

  isAutoStartEnabled(): boolean {
    return this.getSetting('autoStart');
  }

  getPrompts(): { label: string; content: string }[] {
    const settings = this.databaseService.getSettings();

    return settings.prompts
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
    const value = this.getSetting(key);
    return Boolean(value && typeof value === 'string' && value.trim());
  }
}
