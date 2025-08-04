const createMockDatabase = () => ({
  prepare: jest.fn().mockReturnValue({
    run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    get: jest.fn().mockReturnValue(undefined),
    all: jest.fn().mockReturnValue([]),
    pluck: jest.fn().mockReturnThis(),
    bind: jest.fn().mockReturnThis(),
  }),
  exec: jest.fn(),
  pragma: jest.fn(),
  close: jest.fn(),
  transaction: jest.fn((fn) => fn),
});

const Database = jest.fn().mockImplementation(() => createMockDatabase());

export default Database;
