import 'reflect-metadata';

import { ipcMain } from 'electron';

import { registerHandler, registerEvent } from '../../src/main/ipc-registry';

// Mock electron
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
}));

describe('IPC Registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerHandler', () => {
    it('should register a handler with ipcMain.handle', () => {
      const handler = jest.fn().mockReturnValue(true);

      registerHandler('start-recording', handler);

      expect(ipcMain.handle).toHaveBeenCalledWith(
        'start-recording',
        expect.any(Function)
      );
    });

    it('should call the handler with correct arguments when invoked', async () => {
      const handler = jest.fn().mockReturnValue({ id: '123', title: 'Test' });

      registerHandler('get-recording', handler);

      // Get the registered handler
      const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];

      // Call with mock event and args
      const result = await registeredHandler({}, '123');

      expect(handler).toHaveBeenCalledWith('123');
      expect(result).toEqual({ id: '123', title: 'Test' });
    });

    it('should handle async handlers', async () => {
      const handler = jest.fn().mockResolvedValue(true);

      registerHandler('start-recording', handler);

      const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      const result = await registeredHandler({});

      expect(handler).toHaveBeenCalledWith();
      expect(result).toBe(true);
    });

    it('should handle handlers with no arguments', async () => {
      const settings = { assemblyaiKey: 'test-key' };
      const handler = jest.fn().mockReturnValue(settings);

      registerHandler('get-settings', handler);

      const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];
      const result = await registeredHandler({});

      expect(handler).toHaveBeenCalledWith();
      expect(result).toEqual(settings);
    });

    it('should propagate errors from handlers', async () => {
      const error = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(error);

      registerHandler('start-recording', handler);

      const registeredHandler = (ipcMain.handle as jest.Mock).mock.calls[0][1];

      await expect(registeredHandler({})).rejects.toThrow('Handler failed');
    });
  });

  describe('registerEvent', () => {
    it('should register an event listener with ipcMain.on', () => {
      const handler = jest.fn();

      registerEvent('microphone-audio-data', handler);

      expect(ipcMain.on).toHaveBeenCalledWith(
        'microphone-audio-data',
        expect.any(Function)
      );
    });

    it('should call the handler with correct arguments when event is received', () => {
      const handler = jest.fn();
      const audioData = new ArrayBuffer(1024);

      registerEvent('microphone-audio-data', handler);

      const registeredListener = (ipcMain.on as jest.Mock).mock.calls[0][1];
      registeredListener({}, audioData);

      expect(handler).toHaveBeenCalledWith(audioData);
    });

    it('should handle log events with multiple arguments', () => {
      const handler = jest.fn();

      registerEvent('log', handler);

      const registeredListener = (ipcMain.on as jest.Mock).mock.calls[0][1];
      registeredListener({}, 'info', 'Test message', { data: 123 });

      expect(handler).toHaveBeenCalledWith('info', 'Test message', {
        data: 123,
      });
    });
  });
});
