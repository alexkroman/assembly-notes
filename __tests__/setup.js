import { jest } from '@jest/globals';
// Global test setup - suppress console output during tests
Object.assign(globalThis.console, {
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
});
//# sourceMappingURL=setup.js.map