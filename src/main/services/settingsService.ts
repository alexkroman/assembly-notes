import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import type { SlackInstallation, SettingsSchema } from '../../types/common.js';
import type { DatabaseService } from '../database.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import { updateSettings } from '../store/slices/settingsSlice.js';
import type { AppDispatch, RootState } from '../store/store.js';

@injectable()
export class SettingsService {
  constructor(
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.DatabaseService) private databaseService: DatabaseService
  ) {}

  initializeSettings(): void {
    try {
      const settings = this.getSettings();
      this.store.dispatch(updateSettings(settings));
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
    };
  }

  updateSettings(updates: Partial<SettingsSchema>): void {
    this.logger.info('SettingsService.updateSettings called with:', updates);

    // Process each setting update
    Object.entries(updates).forEach(([key, value]) => {
      // Special handling for slackInstallation - explicitly allow null to clear it
      if (key === 'slackInstallation') {
        this.databaseService.setSetting(key, value);
      } else if (value != null) {
        // For other settings, only update if value is not null/undefined
        this.databaseService.setSetting(key, value);
      }
    });

    // Update Redux store with only the specific settings that were changed
    // This preserves any unsaved settings that might be in the Redux state
    this.logger.info('Dispatching partial settings update to Redux:', updates);
    this.store.dispatch(updateSettings(updates));
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
