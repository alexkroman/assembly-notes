import { describe, it, expect } from '@jest/globals';
describe('IPC Handlers', () => {
    it('should export setupIpcHandlers function', async () => {
        const { setupIpcHandlers } = await import('../../src/main/ipc-handlers.ts');
        expect(setupIpcHandlers).toBeDefined();
        expect(typeof setupIpcHandlers).toBe('function');
    });
});
//# sourceMappingURL=ipc-handlers.test.js.map