import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../src/constants/dictationPrompts.js';
import {
  SettingsSchema,
  SlackInstallation,
  SlackChannel,
} from '../../src/types/common.js';

// Helper function to create default mock settings
export const createMockSettings = (
  overrides: Partial<SettingsSchema> = {}
): SettingsSchema => ({
  assemblyaiKey: '',
  slackChannels: '',
  summaryPrompt: 'Summarize the key points from this meeting transcript:',
  prompts: [],
  autoStart: false,
  slackInstallation: null,
  dictationStylingEnabled: false,
  dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
  dictationSilenceTimeout: 2000,
  ...overrides,
});

// Helper function to create mock installation
export const createMockInstallation = (
  overrides: Partial<SlackInstallation> = {}
): SlackInstallation => ({
  teamId: 'T123456',
  teamName: 'Test Team',
  botToken: 'test-bot-token',
  botUserId: 'U123456',
  scope: 'chat:write,channels:read',
  installedAt: Date.now(),
  ...overrides,
});

// Helper function to create mock channel
export const createMockChannel = (
  overrides: Partial<SlackChannel> = {}
): SlackChannel => ({
  id: 'C123456',
  name: 'general',
  isPrivate: false,
  ...overrides,
});
