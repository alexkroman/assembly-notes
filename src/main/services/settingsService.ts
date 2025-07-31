import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import type {
  SlackInstallation,
  SlackChannel,
  SettingsSchema,
} from '../../types/common.js';
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
      slackInstallations: dbSettings.slackInstallations,
      selectedSlackInstallation: dbSettings.selectedSlackInstallation ?? '',
      availableChannels: dbSettings.availableChannels,
    };
  }

  updateSettings(updates: Partial<SettingsSchema>): void {
    this.logger.info('SettingsService.updateSettings called with:', updates);

    Object.entries(updates).forEach(([key, value]) => {
      if (value != null) {
        this.databaseService.setSetting(key, value);
      }
    });

    // Update Redux store with the new settings
    const updatedSettings = this.getSettings();
    this.logger.info('Dispatching updated settings to Redux:', {
      slackInstallations: updatedSettings.slackInstallations,
      selectedSlackInstallation: updatedSettings.selectedSlackInstallation,
      availableChannels: updatedSettings.availableChannels,
    });
    this.store.dispatch(updateSettings(updatedSettings));
  }

  getAssemblyAIKey(): string {
    const settings = this.databaseService.getSettings();
    return settings.assemblyaiKey;
  }

  getSlackChannels(): string {
    const settings = this.databaseService.getSettings();
    return settings.slackChannels;
  }

  getSlackInstallations(): SlackInstallation[] {
    const settings = this.databaseService.getSettings();
    return settings.slackInstallations;
  }

  getSelectedSlackInstallation(): string {
    const settings = this.databaseService.getSettings();
    return settings.selectedSlackInstallation ?? '';
  }

  getAvailableChannels(): SlackChannel[] {
    const settings = this.databaseService.getSettings();
    return settings.availableChannels;
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
    const installations = this.getSlackInstallations();
    return installations.length > 0;
  }
}
