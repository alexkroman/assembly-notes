import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { SettingsService } from '../../../src/main/services/settingsService';
import { createMockSettings } from '../../utils/testHelpers.js';

// Mock the slice actions
jest.mock('../../../src/main/store/slices/settingsSlice', () => ({
  updateSettings: jest.fn(),
}));

const mockStore = {
  getState: jest.fn(() => ({
    settings: createMockSettings({
      assemblyaiKey: 'test-key',
      slackChannels: 'channel1,channel2',
      summaryPrompt: 'test prompt',
    }),
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
  getSettings: jest.fn(),
  setSetting: jest.fn(),
  updateSettings: jest.fn(),
};

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset container
    container.clearInstances();

    // Register mock dependencies
    container.registerInstance(DI_TOKENS.Store, mockStore as any);
    container.registerInstance(DI_TOKENS.Logger, mockLogger);
    container.registerInstance(DI_TOKENS.DatabaseService, mockDatabase as any);

    settingsService = new SettingsService(
      mockStore as any,
      mockLogger as any,
      mockDatabase as any
    );
  });

  describe('initializeSettings', () => {
    it('should initialize settings on construction', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: 'test-key',
          slackChannels: 'channel1,channel2',
        })
      );

      settingsService.initializeSettings();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should handle errors during initialization', () => {
      mockDatabase.getSettings.mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => settingsService.initializeSettings()).not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load settings:',
        expect.any(Error)
      );
    });
  });

  describe('getSettings', () => {
    it('should return settings from database', () => {
      const mockSettings = createMockSettings({
        assemblyaiKey: 'test-key',
        slackChannels: 'general,random',
        slackInstallations: [
          {
            teamId: 'T123',
            teamName: 'Test Team',
            botToken: 'xoxb-123',
            botUserId: 'U123',
            scope: 'chat:write',
            installedAt: Date.now(),
          },
        ],
        selectedSlackInstallation: 'T123',
      });

      mockDatabase.getSettings.mockReturnValue(mockSettings);

      const result = settingsService.getSettings();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    it('should provide default values for missing fields', () => {
      mockDatabase.getSettings.mockReturnValue({
        assemblyaiKey: 'test-key',
        summaryPrompt: '',
        prompts: [],
        selectedPromptIndex: 0,
        autoStart: false,
      });

      const result = settingsService.getSettings();

      expect(result).toEqual(
        createMockSettings({
          assemblyaiKey: 'test-key',
          summaryPrompt:
            'Summarize the key points from this meeting transcript:',
        })
      );
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      mockDatabase.getSettings.mockReturnValue(createMockSettings());
    });

    it('should update individual settings', () => {
      const updates = {
        assemblyaiKey: 'new-key',
        slackChannels: 'general,updates',
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'assemblyaiKey',
        'new-key'
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'slackChannels',
        'general,updates'
      );
    });

    it('should update OAuth-related settings', () => {
      const installation = {
        teamId: 'T123',
        teamName: 'Test Team',
        botToken: 'xoxb-123',
        botUserId: 'U123',
        scope: 'chat:write',
        installedAt: Date.now(),
      };

      const updates = {
        slackInstallations: [installation],
        selectedSlackInstallation: 'T123',
        selectedChannelId: 'C123456',
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'slackInstallations',
        [installation]
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'selectedSlackInstallation',
        'T123'
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'selectedChannelId',
        'C123456'
      );
    });

    it('should skip undefined values', () => {
      const updates = {
        assemblyaiKey: undefined,
        slackChannels: 'channel1',
      };

      settingsService.updateSettings(updates as any);

      expect(mockDatabase.setSetting).not.toHaveBeenCalledWith(
        'assemblyaiKey',
        undefined
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'slackChannels',
        'channel1'
      );
    });

    it('should handle empty updates', () => {
      settingsService.updateSettings({});

      expect(mockDatabase.setSetting).not.toHaveBeenCalled();
    });
  });

  describe('individual getters', () => {
    it('should get AssemblyAI key', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: 'test-api-key',
        })
      );

      const result = settingsService.getAssemblyAIKey();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('test-api-key');
    });

    it('should get Slack installations', () => {
      const installations = [
        {
          teamId: 'T123',
          teamName: 'Test Team',
          botToken: 'xoxb-123',
          botUserId: 'U123',
          scope: 'chat:write',
          installedAt: Date.now(),
        },
      ];
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackInstallations: installations,
        })
      );

      const result = settingsService.getSlackInstallations();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toEqual(installations);
    });

    it('should get Slack channels', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackChannels: 'channel1,channel2',
        })
      );

      const result = settingsService.getSlackChannels();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('channel1,channel2');
    });

    it('should get selected channel ID', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          selectedChannelId: 'C123456',
        })
      );

      const result = settingsService.getSelectedChannelId();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('C123456');
    });

    it('should get selected Slack installation', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          selectedSlackInstallation: 'T123',
        })
      );

      const result = settingsService.getSelectedSlackInstallation();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('T123');
    });

    it('should get available channels', () => {
      const channels = [
        { id: 'C123', name: 'general', isPrivate: false },
        { id: 'C456', name: 'random', isPrivate: false },
      ];
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          availableChannels: channels,
        })
      );

      const result = settingsService.getAvailableChannels();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toEqual(channels);
    });

    it('should get summary prompt', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          summaryPrompt: 'Custom summary prompt',
        })
      );

      const result = settingsService.getSummaryPrompt();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe('Custom summary prompt');
    });

    it('should get default summary prompt when empty', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          summaryPrompt: '',
        })
      );

      const result = settingsService.getSummaryPrompt();

      expect(result).toBe(
        'Summarize the key points from this meeting transcript:'
      );
    });

    it('should check if auto start is enabled', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          autoStart: true,
        })
      );

      const result = settingsService.isAutoStartEnabled();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should get selected prompt index', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          selectedPromptIndex: 2,
        })
      );

      const result = settingsService.getSelectedPromptIndex();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should get prompts with proper format', () => {
      const prompts = [
        { name: 'Summary', content: 'Summarize this' },
        { name: 'Action Items', content: 'List action items' },
      ];
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          prompts,
        })
      );

      const result = settingsService.getPrompts();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toEqual([
        { label: 'Summary', content: 'Summarize this' },
        { label: 'Action Items', content: 'List action items' },
      ]);
    });
  });

  describe('hasNonEmptySetting', () => {
    it('should return true for non-empty string settings', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: '  test-key  ', // With whitespace
          slackChannels: 'channel1,channel2',
          summaryPrompt: 'Custom prompt',
        })
      );

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(true);
      expect(settingsService.hasNonEmptySetting('slackChannels')).toBe(true);
      expect(settingsService.hasNonEmptySetting('summaryPrompt')).toBe(true);
    });

    it('should return false for empty or whitespace-only settings', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: '',
          slackChannels: '   ',
          summaryPrompt: '',
        })
      );

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
      expect(settingsService.hasNonEmptySetting('slackChannels')).toBe(false);
      expect(settingsService.hasNonEmptySetting('summaryPrompt')).toBe(false);
    });

    it('should return false for non-string settings', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          autoStart: true,
        })
      );

      expect(settingsService.hasNonEmptySetting('autoStart')).toBe(false);
    });

    it('should handle null/undefined values', () => {
      mockDatabase.getSettings.mockReturnValue({
        ...createMockSettings(),
        assemblyaiKey: null as any,
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
    });

    it('should return true for valid string values', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: 'valid-key',
        })
      );

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(true);
    });
  });

  describe('hasSlackConfigured', () => {
    it('should return true when Slack installations exist', () => {
      const installations = [
        {
          teamId: 'T123',
          teamName: 'Test Team',
          botToken: 'xoxb-123',
          botUserId: 'U123',
          scope: 'chat:write',
          installedAt: Date.now(),
        },
      ];
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackInstallations: installations,
        })
      );

      const result = settingsService.hasSlackConfigured();

      expect(result).toBe(true);
    });

    it('should return false when no Slack installations exist', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackInstallations: [],
        })
      );

      const result = settingsService.hasSlackConfigured();

      expect(result).toBe(false);
    });
  });
});
