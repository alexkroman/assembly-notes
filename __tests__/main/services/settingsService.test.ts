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

const mockStateBroadcaster = {
  settingsUpdated: jest.fn(),
  broadcast: jest.fn(),
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
    container.registerInstance(
      DI_TOKENS.StateBroadcaster,
      mockStateBroadcaster as any
    );

    settingsService = new SettingsService(
      mockStore as any,
      mockLogger as any,
      mockDatabase as any,
      mockStateBroadcaster as any
    );
  });

  describe('initializeSettings', () => {
    it('should initialize settings on construction', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: 'test-key',
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
      });

      mockDatabase.getSettings.mockReturnValue(mockSettings);

      const result = settingsService.getSettings();

      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    it('should provide default values for missing fields', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: 'test-key',
          summaryPrompt: '', // Empty summary prompt should get default from database layer
        })
      );

      const result = settingsService.getSettings();

      expect(result).toEqual(
        createMockSettings({
          assemblyaiKey: 'test-key',
          summaryPrompt: '', // Database already handles the defaults
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
      };

      settingsService.updateSettings(updates);

      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'assemblyaiKey',
        'new-key'
      );
    });

    it('should skip undefined values', () => {
      const updates = {
        assemblyaiKey: undefined,
        summaryPrompt: 'new prompt',
      };

      settingsService.updateSettings(updates as any);

      expect(mockDatabase.setSetting).not.toHaveBeenCalledWith(
        'assemblyaiKey',
        undefined
      );
      expect(mockDatabase.setSetting).toHaveBeenCalledWith(
        'summaryPrompt',
        'new prompt'
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
          summaryPrompt: 'Custom prompt',
        })
      );

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(true);
      expect(settingsService.hasNonEmptySetting('summaryPrompt')).toBe(true);
    });

    it('should return false for empty or whitespace-only settings', () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          assemblyaiKey: '',
          summaryPrompt: '',
        })
      );

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
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
});
