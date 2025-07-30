import { Store } from '@reduxjs/toolkit';
import { container } from 'tsyringe';

import { DatabaseService } from '../../../src/main/database';
import { DI_TOKENS } from '../../../src/main/di-tokens';
import { SettingsService } from '../../../src/main/services/settingsService';

// Mock the slice actions
const updateSettings = jest.fn();
jest.mock('../../../src/main/store/slices/settingsSlice', () => ({
  updateSettings: jest.fn(),
}));

const mockStore = {
  getState: jest.fn(() => ({
    settings: {
      assemblyaiKey: 'test-key',
      slackBotToken: 'test-token',
      slackChannels: 'channel1,channel2',
      selectedSlackChannel: 'channel1',
      summaryPrompt: 'test prompt',
      selectedPromptIndex: 0,
      prompts: [],
      autoStart: false,
    },
  })),
  dispatch: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockDatabase = {
  setSetting: jest.fn(),
  getSettings: jest.fn(),
};

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Register mocks in container
    container.register(DI_TOKENS.Store, {
      useValue: mockStore as unknown as Store,
    });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger as any });
    container.register(DI_TOKENS.DatabaseService, {
      useValue: mockDatabase as unknown as DatabaseService,
    });

    settingsService = container.resolve(SettingsService);

    // Reset mock implementations to default
    mockDatabase.setSetting.mockReset();
    mockDatabase.getSettings.mockReset();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('initializeSettings', () => {
    it('should load settings from database and update Redux store', () => {
      const mockSettings = {
        prompts: [],
        assemblyaiKey: 'test-key',
        slackBotToken: 'test-token',
        slackChannels: 'channel1,channel2',
        selectedSlackChannel: 'channel1',
        summaryPrompt: 'test prompt',
        selectedPromptIndex: 0,
        autoStart: false,
      };
      mockDatabase.getSettings.mockReturnValue(mockSettings);

      settingsService.initializeSettings();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        updateSettings(mockSettings)
      );
    });

    it('should handle errors during initialization', () => {
      const dbError = new Error('Database connection failed');
      mockDatabase.getSettings.mockImplementation(() => {
        throw dbError;
      });

      settingsService.initializeSettings();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load settings:',
        dbError
      );
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should handle partial settings data', () => {
      const partialSettings = {
        assemblyaiKey: 'test-key',
        // Missing other fields
      };
      mockDatabase.getSettings.mockReturnValue(partialSettings);

      settingsService.initializeSettings();

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        updateSettings(
          expect.objectContaining({
            assemblyaiKey: 'test-key',
          })
        )
      );
    });
  });

  describe('getSettings', () => {
    it('should return complete settings from database', () => {
      const mockSettings = {
        prompts: [{ name: 'Test', content: 'test content' }],
        assemblyaiKey: 'test-key',
        slackBotToken: 'test-token',
        slackChannels: 'channel1,channel2',
        selectedSlackChannel: 'channel1',
        summaryPrompt: 'test prompt',
        selectedPromptIndex: 1,
        autoStart: true,
      };
      mockDatabase.getSettings.mockReturnValue(mockSettings);

      const settings = settingsService.getSettings();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(settings).toEqual(mockSettings);
    });

    it('should return default values when settings are missing', () => {
      const emptySettings = {
        prompts: [],
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        autoStart: false,
      };
      mockDatabase.getSettings.mockReturnValue(emptySettings);

      const settings = settingsService.getSettings();

      expect(settings).toEqual({
        ...emptySettings,
        summaryPrompt: 'Summarize the key points from this meeting transcript:',
      });
    });

    it('should handle database errors gracefully', () => {
      const dbError = new Error('Database read error');
      mockDatabase.getSettings.mockImplementation(() => {
        throw dbError;
      });

      expect(() => settingsService.getSettings()).toThrow(dbError);
    });

    it('should handle null settings from database', () => {
      mockDatabase.getSettings.mockReturnValue({
        prompts: [],
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        autoStart: false,
      });

      const settings = settingsService.getSettings();

      expect(settings).toEqual({
        prompts: [],
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: 'Summarize the key points from this meeting transcript:',
        selectedPromptIndex: 0,
        autoStart: false,
      });
    });
  });

  describe('updateSettings', () => {
    it('should update settings in database successfully', () => {
      const updates = {
        assemblyaiKey: 'new-key',
        slackBotToken: 'new-token',
        autoStart: true,
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'assemblyaiKey',
        'new-key'
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'slackBotToken',
        'new-token'
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith('autoStart', true);
    });

    it('should skip undefined values', () => {
      const updates = {
        assemblyaiKey: 'new-key',
        slackBotToken: undefined,
        autoStart: true,
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'assemblyaiKey',
        'new-key'
      );
      expect(mockDatabase.setSetting).not.toHaveBeenCalledWith(
        'slackBotToken',
        undefined
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith('autoStart', true);
    });

    it('should handle special cases for prompts and slack channels', () => {
      const updates = {
        prompts: [{ name: 'Test', content: 'test content' }],
        slackChannels: 'channel1,channel2',
        selectedSlackChannel: 'channel1',
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'prompts',
        updates.prompts
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'slackChannels',
        'channel1,channel2'
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'selectedSlackChannel',
        'channel1'
      );
    });

    it('should handle database errors during updates', () => {
      const dbError = new Error('Database write error');
      mockDatabase.setSetting.mockImplementation(() => {
        throw dbError;
      });

      const updates = { assemblyaiKey: 'new-key' };

      expect(() => settingsService.updateSettings(updates)).toThrow(dbError);
    });

    it('should handle empty updates object', () => {
      settingsService.updateSettings({});

      expect(mockDatabase.setSetting).not.toHaveBeenCalled();
    });

    it('should handle undefined values in updates', () => {
      const updates = {
        assemblyaiKey: undefined,
        slackBotToken: 'valid-token',
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).not.toHaveBeenCalledWith(
        'assemblyaiKey',
        undefined
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'slackBotToken',
        'valid-token'
      );
    });
  });

  describe('individual getters', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get AssemblyAI key', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: 'test-api-key',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getAssemblyAIKey();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('test-api-key');
    });

    it('should get Slack bot token', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: 'test-slack-token',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getSlackBotToken();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('test-slack-token');
    });

    it('should get Slack channels', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: 'channel1,channel2',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getSlackChannels();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('channel1,channel2');
    });

    it('should get selected Slack channel', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: 'channel1',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getSelectedSlackChannel();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('channel1');
    });

    it('should get summary prompt', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: 'Custom summary prompt',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getSummaryPrompt();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('Custom summary prompt');
    });

    it('should get default summary prompt when empty', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getSummaryPrompt();

      expect(result).toBe(
        'Summarize the key points from this meeting transcript:'
      );
    });

    it('should get auto start status', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: true,
      });

      const result = settingsService.isAutoStartEnabled();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should get selected prompt index', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 2,
        prompts: [],
        autoStart: false,
      });

      const result = settingsService.getSelectedPromptIndex();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should handle database errors in getters', () => {
      const dbError = new Error('Database error');
      mockDatabase.getSettings.mockImplementation(() => {
        throw dbError;
      });

      expect(() => settingsService.getAssemblyAIKey()).toThrow(dbError);
    });
  });

  describe('getPrompts', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return formatted prompts from database', () => {
      const testPrompts = [
        { name: 'Test 1', content: 'content 1' },
        { name: 'Test 2', content: 'content 2' },
      ];
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: testPrompts,
        autoStart: false,
      });

      const prompts = settingsService.getPrompts();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(prompts).toEqual([
        { label: 'Test 1', content: 'content 1' },
        { label: 'Test 2', content: 'content 2' },
      ]);
    });

    it('should return empty array when no prompts exist', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const prompts = settingsService.getPrompts();

      expect(prompts).toEqual([]);
    });

    it('should handle null prompts gracefully', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      const prompts = settingsService.getPrompts();

      expect(prompts).toEqual([]);
    });

    it('should handle malformed prompts gracefully', () => {
      const malformedPrompts = [
        { name: 'Test 1', content: 'content 1' },
        { name: 'Test 2' }, // Missing content
      ];
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: malformedPrompts,
        autoStart: false,
      });

      const prompts = settingsService.getPrompts();

      expect(prompts).toEqual([
        { label: 'Test 1', content: 'content 1' },
        { label: 'Test 2', content: undefined },
      ]);
    });
  });

  describe('hasNonEmptySetting', () => {
    it('should return true for non-empty string settings', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: 'test-key',
        slackBotToken: '  test-token  ', // With whitespace
        slackChannels: '',
        selectedSlackChannel: 'channel1',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(true);
      expect(settingsService.hasNonEmptySetting('slackBotToken')).toBe(true);
      expect(settingsService.hasNonEmptySetting('selectedSlackChannel')).toBe(
        true
      );
    });

    it('should return false for empty or whitespace-only settings', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '   ',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
      expect(settingsService.hasNonEmptySetting('slackBotToken')).toBe(false);
      expect(settingsService.hasNonEmptySetting('slackChannels')).toBe(false);
    });

    it('should return false for non-string settings', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: '',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: true,
      });

      expect(settingsService.hasNonEmptySetting('autoStart')).toBe(false);
      expect(settingsService.hasNonEmptySetting('selectedPromptIndex')).toBe(
        false
      );
    });

    it('should handle undefined or null values gracefully', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: undefined as any,
        slackBotToken: null as any,
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
      expect(settingsService.hasNonEmptySetting('slackBotToken')).toBe(false);
    });

    it('should return true for non-empty Slack bot token', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: '',
        slackBotToken: 'any-non-empty-string-value',
        slackChannels: '',
        selectedSlackChannel: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
      });

      expect(settingsService.hasNonEmptySetting('slackBotToken')).toBe(true);
    });
  });
});
