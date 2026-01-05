/**
 * IPC Registry
 *
 * Type-safe registration helpers for IPC handlers and events.
 * Provides compile-time type checking for channel names, arguments, and return types.
 */

import { ipcMain, IpcMainInvokeEvent, IpcMainEvent } from 'electron';

import type {
  IPCHandlerChannel,
  IPCHandlerArgs,
  IPCHandlerReturn,
  IPCEventChannel,
  IPCEventArgs,
} from '../types/ipc-contract.js';

/**
 * Register a typed IPC handler (request/response pattern).
 * The handler will be invoked via ipcRenderer.invoke() from the renderer.
 *
 * @param channel - The IPC channel name (type-checked against IPCHandlers)
 * @param handler - The handler function with typed arguments and return value
 */
export function registerHandler<C extends IPCHandlerChannel>(
  channel: C,
  handler: (
    ...args: IPCHandlerArgs<C>
  ) => IPCHandlerReturn<C> | Promise<IPCHandlerReturn<C>>
): void {
  ipcMain.handle(
    channel,
    (_event: IpcMainInvokeEvent, ...args: IPCHandlerArgs<C>) => {
      return handler(...args);
    }
  );
}

/**
 * Register a typed IPC event listener (fire-and-forget pattern).
 * Events are sent via ipcRenderer.send() from the renderer.
 *
 * @param channel - The IPC channel name (type-checked against IPCEvents)
 * @param handler - The event handler function with typed arguments
 */
export function registerEvent<C extends IPCEventChannel>(
  channel: C,
  handler: (...args: IPCEventArgs<C>) => void
): void {
  ipcMain.on(channel, (_event: IpcMainEvent, ...args: IPCEventArgs<C>) => {
    handler(...args);
  });
}
