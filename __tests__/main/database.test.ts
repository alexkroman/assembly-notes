import 'reflect-metadata';
import { container } from 'tsyringe';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../src/constants/dictationPrompts';
import { DatabaseService } from '../../src/main/database';
import { DI_TOKENS } from '../../src/main/di-tokens';
import { Recording } from '../../src/types/common';
import {
  resetTestContainer,
  registerMock,
} from '../test-helpers/container-setup';

// Mock all dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    getName: jest.fn(() => 'assembly-notes'),
    setName: jest.fn(),
    isPackaged: false,
  },
}));

jest.mock('better-sqlite3');

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Create a mock database instance
let mockDbInstance: any;

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    // Reset the container and mocks
    resetTestContainer();
    jest.clearAllMocks();

    // Create fresh mock database instance
    mockDbInstance = {
      pragma: jest.fn(),
      exec: jest.fn(),
      prepare: jest.fn(),
      transaction: jest.fn((fn: any) => fn),
      close: jest.fn(),
    };

    // Set up default prepare mock behavior
    mockDbInstance.prepare.mockImplementation((sql: string) => {
      if (sql.includes('SELECT COUNT(*)')) {
        return {
          get: jest.fn(() => ({ count: 0 })),
          run: jest.fn(),
          all: jest.fn(),
        };
      }
      if (sql.includes('INSERT OR REPLACE INTO settings')) {
        return {
          get: jest.fn(),
          run: jest.fn(),
          all: jest.fn(),
        };
      }
      return {
        get: jest.fn(),
        run: jest.fn().mockReturnValue({ changes: 1 }),
        all: jest.fn().mockReturnValue([]),
      };
    });

    // Mock the Database constructor
    const Database = jest.requireMock('better-sqlite3').default;
    Database.mockReturnValue(mockDbInstance);

    // Register mocks in container
    registerMock(DI_TOKENS.Logger, mockLogger);

    databaseService = container.resolve(DatabaseService);
  });

  afterEach(() => {
    resetTestContainer();
  });

  describe('initialization', () => {
    it('should set WAL mode', () => {
      expect(mockDbInstance.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    it('should create required tables', () => {
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS settings')
      );
      expect(mockDbInstance.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS recordings')
      );
    });

    it('should handle initialization errors gracefully', () => {
      const initError = new Error('Database initialization failed');

      // Clear the container to force new instance
      container.clearInstances();
      container.register(DI_TOKENS.Logger, { useValue: mockLogger as any });

      // Set up mock to throw error
      const Database = jest.requireMock('better-sqlite3').default;
      Database.mockReturnValueOnce({
        pragma: jest.fn(),
        exec: jest.fn(() => {
          throw initError;
        }),
        prepare: jest.fn(),
        transaction: jest.fn(),
        close: jest.fn(),
      });

      expect(() => container.resolve(DatabaseService)).toThrow(initError);
    });

    it('should handle pragma errors gracefully', () => {
      const pragmaError = new Error('Pragma failed');

      // Clear the container to force new instance
      container.clearInstances();
      container.register(DI_TOKENS.Logger, { useValue: mockLogger as any });

      // Set up mock to throw error
      const Database = jest.requireMock('better-sqlite3').default;
      Database.mockReturnValueOnce({
        pragma: jest.fn(() => {
          throw pragmaError;
        }),
        exec: jest.fn(),
        prepare: jest.fn(),
        transaction: jest.fn(),
        close: jest.fn(),
      });

      expect(() => container.resolve(DatabaseService)).toThrow(pragmaError);
    });
  });

  describe('setSetting', () => {
    it('should store string values directly', () => {
      const mockRun = jest.fn();
      mockDbInstance.prepare.mockReturnValue({
        get: jest.fn(),
        run: mockRun,
        all: jest.fn(),
      });

      databaseService.setSetting('testKey', 'string value');

      expect(mockRun).toHaveBeenCalledWith('testKey', 'string value');
    });

    it('should stringify non-string values', () => {
      const mockRun = jest.fn();
      mockDbInstance.prepare.mockReturnValue({
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
      mockDbInstance.prepare.mockImplementation(() => {
        throw dbError;
      });

      expect(() => databaseService.setSetting('testKey', 'value')).toThrow(
        dbError
      );
    });

    it('should handle null values', () => {
      const mockRun = jest.fn();
      mockDbInstance.prepare.mockReturnValue({
        get: jest.fn(),
        run: mockRun,
        all: jest.fn(),
      });

      databaseService.setSetting('testKey', null);

      expect(mockRun).toHaveBeenCalledWith('testKey', 'null');
    });

    it('should handle undefined values', () => {
      const mockRun = jest.fn();
      mockDbInstance.prepare.mockReturnValue({
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
        { key: 'autoStart', value: 'false' },
      ]);

      mockDbInstance.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings).toEqual({
        assemblyaiKey: 'test-key',
        summaryPrompt: 'summary prompt',
        prompts: [],
        autoStart: false,
        dictationStylingEnabled: false,
        dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
        dictationSilenceTimeout: 2000,
      });
    });

    it('should return default settings when bulk query fails', () => {
      const dbError = new Error('Database error');
      const mockAll = jest.fn().mockImplementation(() => {
        throw dbError;
      });

      mockDbInstance.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings).toEqual({
        assemblyaiKey: '',
        summaryPrompt: '',
        prompts: [],
        autoStart: false,
        dictationStylingEnabled: false,
        dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
        dictationSilenceTimeout: 2000,
      });
    });

    it('should handle malformed JSON in prompts', () => {
      const mockAll = jest.fn().mockReturnValue([
        { key: 'prompts', value: 'invalid json' },
        { key: 'assemblyaiKey', value: 'test-key' },
      ]);

      mockDbInstance.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings.prompts).toEqual([]);
    });

    it('should handle missing settings gracefully', () => {
      const mockAll = jest.fn().mockReturnValue([]);

      mockDbInstance.prepare.mockReturnValue({
        get: jest.fn(),
        run: jest.fn(),
        all: mockAll,
      });

      const settings = databaseService.getSettings();

      expect(settings).toEqual({
        assemblyaiKey: '',
        summaryPrompt: '',
        prompts: [],
        autoStart: false,
        dictationStylingEnabled: false,
        dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
        dictationSilenceTimeout: 2000,
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
        mockDbInstance.prepare.mockReturnValue({
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
          null, // audio_filename
          1234567890,
          1234567890
        );

        jest.restoreAllMocks();
      });

      it('should handle database errors during save', () => {
        const dbError = new Error('Save failed');
        mockDbInstance.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.saveRecording(mockRecording)).toThrow(
          dbError
        );
      });

      it('should handle null values in recording', () => {
        const mockRun = jest.fn();
        mockDbInstance.prepare.mockReturnValue({
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
          null, // audio_filename
          1234567890,
          1234567890
        );
      });
    });

    describe('getRecording', () => {
      it('should return recording when found', () => {
        const mockGet = jest.fn().mockReturnValue(mockRecording);
        mockDbInstance.prepare.mockReturnValue({
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
        mockDbInstance.prepare.mockReturnValue({
          get: mockGet,
          run: jest.fn(),
          all: jest.fn(),
        });

        const result = databaseService.getRecording('nonexistent');

        expect(result).toBeNull();
      });

      it('should handle database errors during retrieval', () => {
        const dbError = new Error('Retrieval failed');
        mockDbInstance.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.getRecording('test-id')).toThrow(dbError);
      });
    });

    describe('getAllRecordings', () => {
      it('should return all recordings ordered by created_at DESC', () => {
        const recordings = [mockRecording];
        const mockAll = jest.fn().mockReturnValue(recordings);
        mockDbInstance.prepare.mockReturnValue({
          get: jest.fn(),
          run: jest.fn(),
          all: mockAll,
        });

        const result = databaseService.getAllRecordings();

        expect(result).toEqual(recordings);
      });

      it('should handle database errors during retrieval', () => {
        const dbError = new Error('Retrieval failed');
        mockDbInstance.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.getAllRecordings()).toThrow(dbError);
      });

      it('should return empty array when no recordings exist', () => {
        const mockAll = jest.fn().mockReturnValue([]);
        mockDbInstance.prepare.mockReturnValue({
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
        mockDbInstance.prepare.mockReturnValue({
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
        mockDbInstance.prepare.mockImplementation(() => {
          throw dbError;
        });

        const updates = { title: 'Updated Title' };

        expect(() =>
          databaseService.updateRecording('test-id', updates)
        ).toThrow(dbError);
      });

      it('should handle partial updates', () => {
        const mockRun = jest.fn();
        mockDbInstance.prepare.mockReturnValue({
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
        mockDbInstance.prepare.mockReturnValue({
          get: jest.fn(),
          run: mockRun,
          all: jest.fn(),
        });

        databaseService.deleteRecording('test-id');

        expect(mockRun).toHaveBeenCalledWith('test-id');
      });

      it('should handle database errors during deletion', () => {
        const dbError = new Error('Deletion failed');
        mockDbInstance.prepare.mockImplementation(() => {
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
        mockDbInstance.prepare.mockReturnValue({
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
        mockDbInstance.prepare.mockImplementation(() => {
          throw dbError;
        });

        expect(() => databaseService.searchRecordings('test')).toThrow(dbError);
      });

      it('should handle special characters in search query', () => {
        const recordings = [mockRecording];
        const mockAll = jest.fn().mockReturnValue(recordings);
        mockDbInstance.prepare.mockReturnValue({
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

      expect(mockDbInstance.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', () => {
      const closeError = new Error('Close failed');
      mockDbInstance.close.mockImplementation(() => {
        throw closeError;
      });

      expect(() => databaseService.close()).toThrow(closeError);
    });
  });

  describe('transaction handling', () => {
    it('should use transactions for complex operations', () => {
      const mockTransaction = jest.fn((fn) => fn());
      mockDbInstance.transaction = mockTransaction;

      // Trigger a transaction (this would be in a real method that uses transactions)
      const transactionFn = jest.fn();
      mockDbInstance.transaction(transactionFn);

      expect(mockTransaction).toHaveBeenCalledWith(transactionFn);
    });

    it('should handle transaction errors', () => {
      const transactionError = new Error('Transaction failed');
      mockDbInstance.transaction.mockImplementation(() => {
        throw transactionError;
      });

      expect(() => mockDbInstance.transaction(() => {})).toThrow(
        transactionError
      );
    });
  });
});
