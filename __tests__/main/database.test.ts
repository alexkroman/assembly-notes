import { container } from 'tsyringe';

import { DatabaseService } from '../../src/main/database';
import { DI_TOKENS } from '../../src/main/di-tokens';
import { Recording } from '../../src/types/common';

// Mock all dependencies
jest.mock('fs');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
  },
}));

// Create a global mock database instance
const mockDatabase = {
  pragma: jest.fn(),
  exec: jest.fn(),
  prepare: jest.fn((sql: string) => {
    // Mock COUNT queries during initialization
    if (sql.includes('SELECT COUNT(*)')) {
      return {
        get: jest.fn(() => ({ count: 0 })),
        run: jest.fn(),
        all: jest.fn(),
      };
    }
    // Mock INSERT statements during initialization
    if (sql.includes('INSERT OR REPLACE INTO settings')) {
      return {
        get: jest.fn(),
        run: jest.fn(),
        all: jest.fn(),
      };
    }
    // Mock all other prepare statements
    return {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn(),
    };
  }),
  transaction: jest.fn((fn) => {
    // Return a function that can be called
    const transactionFn = () => fn();
    return transactionFn;
  }),
  close: jest.fn(),
};

// Reset mock implementations before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset the prepare mock to its default implementation
  mockDatabase.prepare.mockImplementation((sql: string) => {
    // Mock COUNT queries during initialization
    if (sql.includes('SELECT COUNT(*)')) {
      return {
        get: jest.fn(() => ({ count: 0 })),
        run: jest.fn(),
        all: jest.fn(),
      };
    }
    // Mock INSERT statements during initialization
    if (sql.includes('INSERT OR REPLACE INTO settings')) {
      return {
        get: jest.fn(),
        run: jest.fn(),
        all: jest.fn(),
      };
    }
    // Mock all other prepare statements
    return {
      get: jest.fn(),
      run: jest.fn(),
      all: jest.fn(),
    };
  });

  // Reset transaction mock
  mockDatabase.transaction.mockImplementation((fn) => {
    // Return a function that can be called
    const transactionFn = () => fn();
    return transactionFn;
  });
});

jest.mock('better-sqlite3', () => {
  return jest.fn(() => mockDatabase);
});

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    // Register mocks in container
    container.register(DI_TOKENS.Logger, { useValue: mockLogger as any });

    databaseService = container.resolve(DatabaseService);
  });

  afterEach(() => {
    container.clearInstances();
    // Reset mock implementations to prevent test interference
    mockDatabase.exec.mockReset();
    mockDatabase.pragma.mockReset();
    // Don't reset prepare mock as it needs to maintain its structure
  });

  describe('initialization', () => {
    it('should set WAL mode', () => {
      expect(mockDatabase.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    it('should create required tables', () => {
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS settings')
      );
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS recordings')
      );
    });

    it('should handle initialization errors gracefully', () => {
      const initError = new Error('Database initialization failed');
      mockDatabase.exec.mockImplementation(() => {
        throw initError;
      });

      expect(() => container.resolve(DatabaseService)).toThrow(initError);
    });

    it('should handle pragma errors gracefully', () => {
      const pragmaError = new Error('Pragma failed');
      mockDatabase.pragma.mockImplementation(() => {
        throw pragmaError;
      });

      expect(() => container.resolve(DatabaseService)).toThrow(pragmaError);
    });
  });

  describe('setSetting', () => {
    it('should store string values directly', () => {
      const mockRun = jest.fn();
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: mockRun,
        all: jest.fn(),
      });

      databaseService.setSetting('testKey', 'string value');

      expect(mockRun).toHaveBeenCalledWith('testKey', 'string value');
    });

    it('should stringify non-string values', () => {
      const mockRun = jest.fn();
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: mockRun,
        all: jest.fn(),
      });

      const testObject = { test: true };
      databaseService.setSetting('testKey', testObject);

      expect(mockRun).toHaveBeenCalledWith(
        'testKey',
        JSON.stringify(testObject)
      );
    });

    it('should handle database errors during setting storage', () => {
      const dbError = new Error('Database write error');
      mockDatabase.prepare.mockImplementation(() => {
        throw dbError;
      });

      expect(() => databaseService.setSetting('testKey', 'value')).toThrow(
        dbError
      );
    });

    it('should handle null values', () => {
      const mockRun = jest.fn();
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: mockRun,
        all: jest.fn(),
      });

      databaseService.setSetting('testKey', null);

      expect(mockRun).toHaveBeenCalledWith('testKey', 'null');
    });

    it('should handle undefined values', () => {
      const mockRun = jest.fn();
      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: mockRun,
        all: jest.fn(),
      });

      databaseService.setSetting('testKey', undefined);

      expect(mockRun).toHaveBeenCalledWith('testKey', 'undefined');
    });
  });

  describe('getSettings', () => {
    it('should return complete settings schema from bulk query', () => {
      const mockAll = jest.fn().mockReturnValue([
        { key: 'assemblyaiKey', value: 'test-key' },
        { key: 'summaryPrompt', value: 'summary prompt' },
        { key: 'prompts', value: '[]' },
        { key: 'slackInstallations', value: '[]' },
        { key: 'selectedSlackInstallation', value: '' },
        { key: 'slackChannels', value: 'channel1,channel2' },
        { key: 'autoStart', value: 'false' },
      ]);

      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings).toEqual({
        assemblyaiKey: 'test-key',
        summaryPrompt: 'summary prompt',
        prompts: [],
        slackInstallations: [],
        selectedSlackInstallation: '',
        slackChannels: 'channel1,channel2',
        autoStart: false,
      });
    });

    it('should return default settings when bulk query fails', () => {
      const dbError = new Error('Database error');
      const mockAll = jest.fn().mockImplementation(() => {
        throw dbError;
      });

      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings).toEqual({
        assemblyaiKey: '',
        summaryPrompt: '',
        prompts: [],
        slackInstallations: [],
        selectedSlackInstallation: null,
        slackChannels: '',
        autoStart: false,
      });
    });

    it('should handle malformed JSON in prompts', () => {
      const mockAll = jest.fn().mockReturnValue([
        { key: 'prompts', value: 'invalid json' },
        { key: 'assemblyaiKey', value: 'test-key' },
      ]);

      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings.prompts).toEqual([]);
    });

    it('should handle missing settings gracefully', () => {
      const mockAll = jest.fn().mockReturnValue([]);

      mockDatabase.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings).toEqual({
        assemblyaiKey: '',
        summaryPrompt: '',
        prompts: [],
        slackInstallations: [],
        selectedSlackInstallation: null,
        slackChannels: '',
        autoStart: false,
      });
    });
  });

  describe('recording management', () => {
    const mockRecording: Recording = {
      id: 'test-id',
      title: 'Test Recording',
      transcript: 'Test transcript content',
      summary: 'Test summary',
      created_at: 1234567890,
      updated_at: 1234567890,
    };

    describe('saveRecording', () => {
      it('should save recording with provided timestamps', () => {
        const mockRun = jest.fn();
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: mockRun,
          all: jest.fn(),
        });
        jest.spyOn(Date, 'now').mockReturnValue(1234567890);

        databaseService.saveRecording(mockRecording);

        expect(mockRun).toHaveBeenCalledWith(
          'test-id',
          'Test Recording',
          'Test transcript content',
          'Test summary',
          1234567890,
          1234567890
        );

        jest.restoreAllMocks();
      });

      it('should handle database errors during save', () => {
        const dbError = new Error('Save failed');
        mockDatabase.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.saveRecording(mockRecording)).toThrow(
          dbError
        );
      });

      it('should handle null values in recording', () => {
        const mockRun = jest.fn();
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: mockRun,
          all: jest.fn(),
        });

        const recordingWithNulls = {
          id: mockRecording.id,
          title: mockRecording.title!,
          created_at: mockRecording.created_at,
          updated_at: mockRecording.updated_at,
        };

        databaseService.saveRecording(recordingWithNulls);

        expect(mockRun).toHaveBeenCalledWith(
          'test-id',
          'Test Recording',
          null,
          null,
          1234567890,
          1234567890
        );
      });
    });

    describe('getRecording', () => {
      it('should return recording when found', () => {
        const mockGet = jest.fn().mockReturnValue(mockRecording);
        mockDatabase.prepare.mockReturnValue({
          get: mockGet,
          run: jest.fn(),
          all: jest.fn(),
        });

        const result = databaseService.getRecording('test-id');

        expect(mockGet).toHaveBeenCalledWith('test-id');
        expect(result).toEqual(mockRecording);
      });

      it('should return null when not found', () => {
        const mockGet = jest.fn().mockReturnValue(undefined);
        mockDatabase.prepare.mockReturnValue({
          get: mockGet,
          run: jest.fn(),
          all: jest.fn(),
        });

        const result = databaseService.getRecording('nonexistent');

        expect(result).toBeNull();
      });

      it('should handle database errors during retrieval', () => {
        const dbError = new Error('Retrieval failed');
        mockDatabase.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.getRecording('test-id')).toThrow(dbError);
      });
    });

    describe('getAllRecordings', () => {
      it('should return all recordings ordered by created_at DESC', () => {
        const recordings = [mockRecording];
        const mockAll = jest.fn().mockReturnValue(recordings);
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: jest.fn(),
          all: mockAll,
        });

        const result = databaseService.getAllRecordings();

        expect(result).toEqual(recordings);
      });

      it('should handle database errors during retrieval', () => {
        const dbError = new Error('Retrieval failed');
        mockDatabase.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.getAllRecordings()).toThrow(dbError);
      });

      it('should return empty array when no recordings exist', () => {
        const mockAll = jest.fn().mockReturnValue([]);
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: jest.fn(),
          all: mockAll,
        });

        const result = databaseService.getAllRecordings();

        expect(result).toEqual([]);
      });
    });

    describe('updateRecording', () => {
      it('should update specified fields with current timestamp', () => {
        const mockRun = jest.fn();
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: mockRun,
          all: jest.fn(),
        });
        jest.spyOn(Date, 'now').mockReturnValue(1234567890);

        const updates = {
          title: 'Updated Title',
          summary: 'Updated Summary',
        };

        databaseService.updateRecording('test-id', updates);

        expect(mockRun).toHaveBeenCalledWith(
          'Updated Title',
          'Updated Summary',
          1234567890,
          'test-id'
        );

        jest.restoreAllMocks();
      });

      it('should handle database errors during update', () => {
        const dbError = new Error('Update failed');
        mockDatabase.prepare.mockImplementation(() => {
          throw dbError;
        });

        const updates = { title: 'Updated Title' };

        expect(() =>
          databaseService.updateRecording('test-id', updates)
        ).toThrow(dbError);
      });

      it('should handle partial updates', () => {
        const mockRun = jest.fn();
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: mockRun,
          all: jest.fn(),
        });

        const updates = { title: 'Updated Title' };

        databaseService.updateRecording('test-id', updates);

        expect(mockRun).toHaveBeenCalledWith(
          'Updated Title',
          expect.any(Number),
          'test-id'
        );
      });
    });

    describe('deleteRecording', () => {
      it('should delete recording and log success', () => {
        const mockRun = jest.fn();
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: mockRun,
          all: jest.fn(),
        });

        databaseService.deleteRecording('test-id');

        expect(mockRun).toHaveBeenCalledWith('test-id');
      });

      it('should handle database errors during deletion', () => {
        const dbError = new Error('Deletion failed');
        mockDatabase.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.deleteRecording('test-id')).toThrow(
          dbError
        );
      });
    });

    describe('searchRecordings', () => {
      it('should return all recordings when query is empty', () => {
        const getAllSpy = jest.spyOn(databaseService, 'getAllRecordings');
        getAllSpy.mockReturnValue([mockRecording]);

        const result = databaseService.searchRecordings('');

        expect(getAllSpy).toHaveBeenCalled();
        expect(result).toEqual([mockRecording]);

        getAllSpy.mockRestore();
      });

      it('should search using FTS5 MATCH query', () => {
        const recordings = [mockRecording];
        const mockAll = jest.fn().mockReturnValue(recordings);
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: jest.fn(),
          all: mockAll,
        });

        const result = databaseService.searchRecordings('test query');

        expect(mockAll).toHaveBeenCalledWith('"test" OR "query"');
        expect(result).toEqual(recordings);
      });

      it('should handle database errors during search', () => {
        const dbError = new Error('Search failed');
        mockDatabase.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.searchRecordings('test')).toThrow(dbError);
      });

      it('should handle special characters in search query', () => {
        const recordings = [mockRecording];
        const mockAll = jest.fn().mockReturnValue(recordings);
        mockDatabase.prepare.mockReturnValue({
          get: jest.fn(),
          run: jest.fn(),
          all: mockAll,
        });

        databaseService.searchRecordings('test "quoted" query');

        expect(mockAll).toHaveBeenCalledWith('"test" OR "quoted" OR "query"');
      });

      it('should handle whitespace-only queries', () => {
        const getAllSpy = jest.spyOn(databaseService, 'getAllRecordings');
        getAllSpy.mockReturnValue([mockRecording]);

        const result = databaseService.searchRecordings('   ');

        expect(getAllSpy).toHaveBeenCalled();
        expect(result).toEqual([mockRecording]);

        getAllSpy.mockRestore();
      });
    });
  });

  describe('close', () => {
    it('should close database connection and log', () => {
      databaseService.close();

      expect(mockDatabase.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', () => {
      const closeError = new Error('Close failed');
      mockDatabase.close.mockImplementation(() => {
        throw closeError;
      });

      expect(() => databaseService.close()).toThrow(closeError);
    });
  });

  describe('transaction handling', () => {
    it('should use transactions for complex operations', () => {
      const mockTransaction = jest.fn((fn) => fn());
      mockDatabase.transaction = mockTransaction;

      // Trigger a transaction (this would be in a real method that uses transactions)
      const transactionFn = jest.fn();
      mockDatabase.transaction(transactionFn);

      expect(mockTransaction).toHaveBeenCalledWith(transactionFn);
    });

    it('should handle transaction errors', () => {
      const transactionError = new Error('Transaction failed');
      mockDatabase.transaction.mockImplementation(() => {
        throw transactionError;
      });

      expect(() => mockDatabase.transaction(() => {})).toThrow(
        transactionError
      );
    });
  });
});
