import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../src/constants/prompts.js';
import { SettingsSchema } from '../../src/types/common.js';

// Helper function to create default mock settings
export const createMockSettings = (
  overrides: Partial<SettingsSchema> = {}
): SettingsSchema => ({
  assemblyaiKey: '',
  summaryPrompt: 'Summarize the key points from this meeting transcript:',
  prompts: [],
  autoStart: false,
  dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
  ...overrides,
});
