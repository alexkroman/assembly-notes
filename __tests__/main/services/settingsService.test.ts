import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { SettingsService } from '../../../src/main/services/settingsService';
import { createMockSettings } from '../../utils/testHelpers.js';

// Mock the slice actions
jest.mock('../../../src/main/store/slices/settingsSlice', () => ({
  updateSettings: jest.fn(),
}));

// Mock the settings store
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockGetAll = jest.fn();
const mockGetAssemblyAIKey = jest.fn();
const mockSetAssemblyAIKey = jest.fn();

jest.mock('../../../src/main/settings-store', () => ({
  settingsStore: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    getAll: () => mockGetAll(),
    getAssemblyAIKey: () => mockGetAssemblyAIKey(),
    setAssemblyAIKey: (key: string) => mockSetAssemblyAIKey(key),
  },
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
    container.registerInstance(
      DI_TOKENS.StateBroadcaster,
      mockStateBroadcaster as any
    );

    settingsService = new SettingsService(
      mockStore as any,
      mockLogger as any,
      mockStateBroadcaster as any
    );
  });

  describe('initializeSettings', () => {
    it('should initialize settings on construction', () => {
      mockGetAssemblyAIKey.mockReturnValue('test-key');
      mockGet.mockImplementation((key) => {
        const settings = createMockSettings({
          assemblyaiKey: 'test-key',
        });
        return settings[key as keyof typeof settings];
      });

      settingsService.initializeSettings();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should handle errors during initialization', () => {
      mockGetAssemblyAIKey.mockImplementation(() => {
        throw new Error('Store error');
      });

      expect(() => settingsService.initializeSettings()).not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load settings:',
        expect.any(Error)
      );
    });
  });

  describe('getSettings', () => {
    it('should return settings from store', () => {
      const mockSettings = createMockSettings({
        assemblyaiKey: 'test-key',
      });

      mockGetAssemblyAIKey.mockReturnValue('test-key');
      mockGet.mockImplementation((key) => {
        return mockSettings[key as keyof typeof mockSettings];
      });

      const result = settingsService.getSettings();

      expect(result.assemblyaiKey).toBe('test-key');
    });

    it('should provide default values for missing fields', () => {
      mockGetAssemblyAIKey.mockReturnValue('test-key');
      mockGet.mockImplementation((key) => {
        if (key === 'summaryPrompt') return '';
        const settings = createMockSettings({ assemblyaiKey: 'test-key' });
        return settings[key as keyof typeof settings];
      });

      const result = settingsService.getSettings();

      expect(result.summaryPrompt).toBe(
        'Summarize the key points from this meeting transcript:'
      );
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      mockGetAssemblyAIKey.mockReturnValue('');
      mockGet.mockImplementation((key) => {
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });
    });

    it('should update individual settings', () => {
      const updates = {
        assemblyaiKey: 'new-key',
      };

      settingsService.updateSettings(updates);

      expect(mockSetAssemblyAIKey).toHaveBeenCalledWith('new-key');
    });

    it('should skip undefined values', () => {
      const updates = {
        assemblyaiKey: undefined,
        summaryPrompt: 'new prompt',
      };

      settingsService.updateSettings(updates as any);

      expect(mockSet).not.toHaveBeenCalledWith('assemblyaiKey', undefined);
      expect(mockSet).toHaveBeenCalledWith('summaryPrompt', 'new prompt');
    });

    it('should handle empty updates', () => {
      settingsService.updateSettings({});

      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe('individual getters', () => {
    it('should get AssemblyAI key', () => {
      mockGetAssemblyAIKey.mockReturnValue('test-api-key');
      mockGet.mockImplementation((key) => {
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      const result = settingsService.getAssemblyAIKey();

      expect(result).toBe('test-api-key');
    });

    it('should get summary prompt', () => {
      mockGet.mockImplementation((key) => {
        if (key === 'summaryPrompt') return 'Custom summary prompt';
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      const result = settingsService.getSummaryPrompt();

      expect(result).toBe('Custom summary prompt');
    });

    it('should get default summary prompt when empty', () => {
      mockGet.mockImplementation((key) => {
        if (key === 'summaryPrompt') return '';
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      const result = settingsService.getSummaryPrompt();

      expect(result).toBe(
        'Summarize the key points from this meeting transcript:'
      );
    });

    it('should check if auto start is enabled', () => {
      mockGet.mockImplementation((key) => {
        if (key === 'autoStart') return true;
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      const result = settingsService.isAutoStartEnabled();

      expect(result).toBe(true);
    });

    it('should get prompts with proper format', () => {
      const prompts = [
        { name: 'Summary', content: 'Summarize this' },
        { name: 'Action Items', content: 'List action items' },
      ];
      mockGet.mockImplementation((key) => {
        if (key === 'prompts') return prompts;
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      const result = settingsService.getPrompts();

      expect(result).toEqual([
        { label: 'Summary', content: 'Summarize this' },
        { label: 'Action Items', content: 'List action items' },
      ]);
    });
  });

  describe('hasNonEmptySetting', () => {
    it('should return true for non-empty string settings', () => {
      mockGetAssemblyAIKey.mockReturnValue('  test-key  ');
      mockGet.mockImplementation((key) => {
        if (key === 'summaryPrompt') return 'Custom prompt';
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(true);
      expect(settingsService.hasNonEmptySetting('summaryPrompt')).toBe(true);
    });

    it('should return false for empty or whitespace-only settings', () => {
      mockGetAssemblyAIKey.mockReturnValue('');
      mockGet.mockImplementation((key) => {
        if (key === 'summaryPrompt') return '';
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
      expect(settingsService.hasNonEmptySetting('summaryPrompt')).toBe(false);
    });

    it('should return false for non-string settings', () => {
      mockGetAssemblyAIKey.mockReturnValue('');
      mockGet.mockImplementation((key) => {
        if (key === 'autoStart') return true;
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      expect(settingsService.hasNonEmptySetting('autoStart')).toBe(false);
    });

    it('should handle null/undefined values', () => {
      mockGetAssemblyAIKey.mockReturnValue(null as unknown as string);
      mockGet.mockImplementation((key) => {
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(false);
    });

    it('should return true for valid string values', () => {
      mockGetAssemblyAIKey.mockReturnValue('valid-key');
      mockGet.mockImplementation((key) => {
        const settings = createMockSettings();
        return settings[key as keyof typeof settings];
      });

      expect(settingsService.hasNonEmptySetting('assemblyaiKey')).toBe(true);
    });
  });
});
