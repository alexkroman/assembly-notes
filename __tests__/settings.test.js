jest.mock('electron-store');
jest.mock('../src/main/logger.js', () => ({
  error: jest.fn(),
}));

describe('Settings Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh require cache for this test
    jest.resetModules();

    // Re-require the modules to get fresh instances
    jest.doMock('electron-store', () => {
      return jest.fn().mockImplementation(() => ({
        store: {
          assemblyaiKey: 'test-key',
          customPrompt: 'test-prompt',
        },
        set: jest.fn(function (key, value) {
          this.store[key] = value;
        }),
        get: jest.fn(function (key) {
          return this.store[key];
        }),
      }));
    });
  });

  describe('loadSettings', () => {
    it('should be a no-op function', () => {
      const { loadSettings } = require('../src/main/settings');
      expect(() => loadSettings()).not.toThrow();
    });
  });

  describe('getSettings', () => {
    it('should return all settings from the store', () => {
      const { getSettings } = require('../src/main/settings');
      const settings = getSettings();
      expect(settings).toEqual({
        assemblyaiKey: 'test-key',
        customPrompt: 'test-prompt',
      });
    });
  });

  describe('saveSettingsToFile', () => {
    it('should save each setting to the store', () => {
      const { saveSettingsToFile } = require('../src/main/settings');
      const Store = require('electron-store');
      const mockStore = Store.mock.results[0].value;
      const newSettings = {
        assemblyaiKey: 'new-key',
      };

      saveSettingsToFile(newSettings);

      expect(mockStore.set).toHaveBeenCalledTimes(1);
      expect(mockStore.set).toHaveBeenCalledWith('assemblyaiKey', 'new-key');
    });

    it('should handle partial settings updates', () => {
      const { saveSettingsToFile } = require('../src/main/settings');
      const Store = require('electron-store');
      const mockStore = Store.mock.results[0].value;
      const partialSettings = {
        customPrompt: 'new-prompt',
      };

      saveSettingsToFile(partialSettings);

      expect(mockStore.set).toHaveBeenCalledTimes(1);
      expect(mockStore.set).toHaveBeenCalledWith('customPrompt', 'new-prompt');
    });

    it('should throw error when store.set fails', () => {
      const { saveSettingsToFile } = require('../src/main/settings');
      const Store = require('electron-store');
      const mockStore = Store.mock.results[0].value;
      const log = require('../src/main/logger.js');
      mockStore.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => {
        saveSettingsToFile({ assemblyaiKey: 'failing-key' });
      }).toThrow('Storage error');

      expect(log.error).toHaveBeenCalledWith(
        'Error saving settings:',
        expect.any(Error)
      );
    });
  });
});
