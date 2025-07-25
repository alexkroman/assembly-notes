import { jest } from '@jest/globals';

jest.mock('electron-store');
jest.mock('../src/main/logger', () => ({
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
        set: jest.fn(function (this: any, key: string, value: any) {
          this.store[key] = value;
        }),
        get: jest.fn(function (this: any, key: string) {
          return this.store[key];
        }),
      }));
    });
  });

  describe('loadSettings', () => {
    it('should be a no-op function', async () => {
      const { loadSettings } = await import('../src/main/settings');
      expect(() => loadSettings()).not.toThrow();
    });
  });

  describe('getSettings', () => {
    it('should return all settings from the store', async () => {
      const { getSettings } = await import('../src/main/settings');
      const settings = getSettings();
      expect(settings).toEqual({
        assemblyaiKey: 'test-key',
        customPrompt: 'test-prompt',
      });
    });
  });

  describe('saveSettingsToFile', () => {
    it('should save each setting to the store', async () => {
      const { saveSettingsToFile } = await import('../src/main/settings');
      const Store = (await import('electron-store')).default;
      const mockStore = (Store as any).mock.results[0].value;
      const newSettings = {
        assemblyaiKey: 'new-key',
      };

      saveSettingsToFile(newSettings);

      expect(mockStore.set).toHaveBeenCalledTimes(1);
      expect(mockStore.set).toHaveBeenCalledWith('assemblyaiKey', 'new-key');
    });

    it('should handle partial settings updates', async () => {
      const { saveSettingsToFile } = await import('../src/main/settings');
      const Store = (await import('electron-store')).default;
      const mockStore = (Store as any).mock.results[0].value;
      const partialSettings = {
        customPrompt: 'new-prompt',
      };

      saveSettingsToFile(partialSettings);

      expect(mockStore.set).toHaveBeenCalledTimes(1);
      expect(mockStore.set).toHaveBeenCalledWith('customPrompt', 'new-prompt');
    });

    it('should throw error when store.set fails', async () => {
      const { saveSettingsToFile } = await import('../src/main/settings');
      const Store = (await import('electron-store')).default;
      const mockStore = (Store as any).mock.results[0].value;
      const log = await import('../src/main/logger');
      mockStore.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => {
        saveSettingsToFile({ assemblyaiKey: 'failing-key' });
      }).toThrow('Storage error');

      expect((log as any).error).toHaveBeenCalledWith(
        'Error saving settings:',
        expect.any(Error)
      );
    });
  });
});
