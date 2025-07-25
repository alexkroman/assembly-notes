import { jest } from '@jest/globals';

interface MockStoreOptions {
  defaults?: Record<string, any>;
}

class MockStore {
  defaults: Record<string, any>;
  store: Record<string, any>;
  set: jest.MockedFunction<(key: string, value: any) => void>;
  get: jest.MockedFunction<(key: string) => any>;

  constructor(options: MockStoreOptions = {}) {
    this.defaults = options.defaults || {};
    this.store = { ...this.defaults };
    this.set = jest.fn((key: string, value: any) => {
      this.store[key] = value;
    });
    this.get = jest.fn((key: string) => this.store[key]);
  }
}

export default MockStore;
