/**
 * Typed IPC Helpers for Preload Script
 *
 * Factory functions to create type-safe IPC invokers and senders.
 * These provide compile-time type checking for channel names and arguments.
 */

import { ipcRenderer } from 'electron';

import type {
  IPCHandlerChannel,
  IPCHandlerArgs,
  IPCHandlerReturn,
  IPCEventChannel,
  IPCEventArgs,
} from '../types/ipc-contract.js';

/**
 * Create a typed invoker for request/response IPC calls.
 * Returns a function that invokes the handler and returns a typed Promise.
 *
 * @param channel - The IPC channel name (type-checked against IPCHandlers)
 * @returns A function that invokes the channel with typed args and return value
 */
export function createInvoker<C extends IPCHandlerChannel>(
  channel: C
): (...args: IPCHandlerArgs<C>) => Promise<IPCHandlerReturn<C>> {
  return (...args: IPCHandlerArgs<C>): Promise<IPCHandlerReturn<C>> =>
    ipcRenderer.invoke(channel, ...args) as Promise<IPCHandlerReturn<C>>;
}

/**
 * Create a typed sender for fire-and-forget IPC events.
 * Returns a function that sends the event without waiting for a response.
 *
 * @param channel - The IPC channel name (type-checked against IPCEvents)
 * @returns A function that sends to the channel with typed args
 */
export function createSender<C extends IPCEventChannel>(
  channel: C
): (...args: IPCEventArgs<C>) => void {
  return (...args: IPCEventArgs<C>): void => {
    ipcRenderer.send(channel, ...args);
  };
}
