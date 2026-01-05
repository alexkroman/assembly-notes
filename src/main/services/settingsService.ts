import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../constants/dictationPrompts.js';
import type { SlackInstallation, SettingsSchema } from '../../types/common.js';
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
      slackChannels: dbSettings.slackChannels,
      summaryPrompt: dbSettings.summaryPrompt,
      prompts: dbSettings.prompts,
      autoStart: dbSettings.autoStart,
      slackInstallation: dbSettings.slackInstallation,
      dictationStylingEnabled: dbSettings.dictationStylingEnabled || false,
      dictationStylingPrompt:
        dbSettings.dictationStylingPrompt || DEFAULT_DICTATION_STYLING_PROMPT,
      dictationSilenceTimeout: dbSettings.dictationSilenceTimeout || 2000,
    };
  }

  updateSettings(updates: Partial<SettingsSchema>): void {
    this.logger.info('SettingsService.updateSettings called with:', updates);

    // Build a new object with only the settings that will be persisted
    const persistedUpdates = Object.entries(updates).reduce<
      Partial<SettingsSchema>
    >((acc, [key, value]) => {
      // Only persist settings that have meaningful values
      // For slackInstallation, null is meaningful (clears the installation)
      // For other settings, only non-null/undefined values are meaningful
      const shouldPersist = key === 'slackInstallation' || value != null;

      if (shouldPersist) {
        this.databaseService.setSetting(key, value);
        return { ...acc, [key]: value };
      }

      return acc;
    }, {});

    // Update Redux store with only the settings that were actually persisted
    // This ensures Redux state matches what's in the database
    this.logger.info(
      'Dispatching persisted settings update to Redux:',
      persistedUpdates
    );
    this.store.dispatch(updateSettings(persistedUpdates));
    this.stateBroadcaster.settingsUpdated(persistedUpdates);
  }

  getAssemblyAIKey(): string {
    const settings = this.databaseService.getSettings();
    return settings.assemblyaiKey;
  }

  getSlackChannels(): string {
    const settings = this.databaseService.getSettings();
    return settings.slackChannels;
  }

  getSlackInstallation(): SlackInstallation | null {
    const settings = this.databaseService.getSettings();
    return settings.slackInstallation;
  }

  getSummaryPrompt(): string {
    const settings = this.databaseService.getSettings();
    return (
      settings.summaryPrompt ||
      'Summarize the key points from this meeting transcript:'
    );
  }

  isAutoStartEnabled(): boolean {
    const settings = this.databaseService.getSettings();
    return settings.autoStart;
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
    const settings = this.databaseService.getSettings();
    const value = settings[key];
    return Boolean(value && typeof value === 'string' && value.trim());
  }

  // Helper method to check if Slack is configured
  hasSlackConfigured(): boolean {
    const installation = this.getSlackInstallation();
    return installation !== null;
  }
}
