class MockStore {
  constructor(options = {}) {
    this.defaults = options.defaults || {};
    this.store = { ...this.defaults };
    this.set = jest.fn((key, value) => {
      this.store[key] = value;
    });
    this.get = jest.fn((key) => this.store[key]);
  }
}

module.exports = MockStore;
