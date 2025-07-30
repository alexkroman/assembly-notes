import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import type { PromptTemplate } from '../../types/common.js';
import type { DatabaseService } from '../database.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import { updateSettings } from '../store/slices/settingsSlice.js';
import type { AppDispatch, RootState } from '../store/store.js';

interface StoredSettings {
  assemblyaiKey: string;
  slackBotToken: string;
  slackChannels: string;
  selectedSlackChannel: string;
  summaryPrompt: string;
  selectedPromptIndex: number;
  prompts: PromptTemplate[];
  autoStart: boolean;
}

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

  getSettings(): StoredSettings {
    const dbSettings = this.databaseService.getSettings();

    return {
      assemblyaiKey: dbSettings.assemblyaiKey,
      slackBotToken: dbSettings.slackBotToken,
      slackChannels: dbSettings.slackChannels,
      selectedSlackChannel: dbSettings.selectedSlackChannel,
      summaryPrompt:
        dbSettings.summaryPrompt ||
        'Summarize the key points from this meeting transcript:',
      selectedPromptIndex: dbSettings.selectedPromptIndex,
      prompts: dbSettings.prompts,
      autoStart: dbSettings.autoStart,
    };
  }

  updateSettings(updates: {
    [K in keyof StoredSettings]?: StoredSettings[K] | undefined;
  }): void {
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'prompts') {
          this.databaseService.setSetting(key, value);
        } else if (key === 'slackChannels') {
          this.databaseService.setSetting('slackChannels', value);
        } else if (key === 'selectedSlackChannel') {
          this.databaseService.setSetting('selectedSlackChannel', value);
        } else {
          this.databaseService.setSetting(key, value);
        }
      }
    });
  }

  getAssemblyAIKey(): string {
    const settings = this.databaseService.getSettings();
    return settings.assemblyaiKey;
  }

  getSlackBotToken(): string {
    const settings = this.databaseService.getSettings();
    return settings.slackBotToken;
  }

  getSlackChannels(): string {
    const settings = this.databaseService.getSettings();
    return settings.slackChannels;
  }

  getSelectedSlackChannel(): string {
    const settings = this.databaseService.getSettings();
    return settings.selectedSlackChannel;
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

  getSelectedPromptIndex(): number {
    const settings = this.databaseService.getSettings();
    return settings.selectedPromptIndex;
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
  hasNonEmptySetting(key: keyof StoredSettings): boolean {
    const settings = this.databaseService.getSettings();
    const value = settings[key];
    return Boolean(value && typeof value === 'string' && value.trim());
  }
}
