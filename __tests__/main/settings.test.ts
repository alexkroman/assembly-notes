import { jest } from '@jest/globals';

describe('Settings', () => {
  let settings: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Import the settings module which should use mocked dependencies
    settings = await import('../../src/main/settings');
  });

  describe('loadSettings', () => {
    it('should be a function', () => {
      expect(settings.loadSettings).toBeDefined();
      expect(typeof settings.loadSettings).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => {
        settings.loadSettings();
      }).not.toThrow();
    });
  });

  describe('getSettings', () => {
    it('should return current settings', () => {
      const result = settings.getSettings();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('saveSettingsToFile', () => {
    it('should be a function', () => {
      expect(settings.saveSettingsToFile).toBeDefined();
      expect(typeof settings.saveSettingsToFile).toBe('function');
    });

    it('should not throw when called with valid settings', () => {
      expect(() => {
        settings.saveSettingsToFile({ assemblyaiKey: 'test-key' });
      }).not.toThrow();
    });

    it('should handle empty settings object', () => {
      expect(() => {
        settings.saveSettingsToFile({});
      }).not.toThrow();
    });

    it('should handle multiple settings', () => {
      expect(() => {
        settings.saveSettingsToFile({
          assemblyaiKey: 'test-key',
          customPrompt: 'test prompt',
          keepAliveEnabled: false,
        });
      }).not.toThrow();
    });
  });
});
