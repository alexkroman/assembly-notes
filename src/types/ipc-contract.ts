/**
 * IPC Contract Types
 *
 * Single source of truth for all IPC communication types.
 * Defines the contract between main and renderer processes.
 */

import type { PromptTemplate, Recording, SettingsSchema } from './common.js';

// ============================================================================
// IPC Handlers (Request/Response via ipcMain.handle)
// ============================================================================

/**
 * All IPC handlers with their argument and return types.
 * Used by both main process (registerHandler) and renderer (createInvoker).
 */
export interface IPCHandlers {
  // Recording Control
  'start-recording': { args: []; return: boolean };
  'stop-recording': { args: []; return: boolean };
  'new-recording': { args: []; return: string | null };
  'load-recording': { args: [recordingId: string]; return: boolean };
  'summarize-transcript': { args: [transcript?: string]; return: boolean };

  // Recording Data
  'get-all-recordings': { args: []; return: Recording[] };
  'search-recordings': { args: [query: string]; return: Recording[] };
  'get-recording': { args: [id: string]; return: Recording | null };
  'delete-recording': { args: [id: string]; return: boolean };

  'update-recording-title': {
    args: [recordingId: string, title: string];
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    return: void;
  };

  'update-recording-summary': {
    args: [recordingId: string, summary: string];
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    return: void;
  };
  'get-audio-file-path': { args: [recordingId: string]; return: string | null };
  'show-audio-in-folder': { args: [recordingId: string]; return: boolean };

  // Settings
  'get-settings': { args: []; return: SettingsSchema };
  'save-settings': {
    args: [settings: Partial<SettingsSchema>];
    return: boolean;
  };
  'save-prompt': {
    args: [promptSettings: Pick<SettingsSchema, 'summaryPrompt'>];
    return: boolean;
  };
  'save-prompts': { args: [prompts: PromptTemplate[]]; return: boolean };

  // Auto-Update
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  'install-update': { args: []; return: void };
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  'quit-and-install': { args: []; return: void };
}

// ============================================================================
// IPC Events (Fire-and-Forget via ipcMain.on)
// ============================================================================

/**
 * Fire-and-forget events from renderer to main.
 * No response expected.
 */
export interface IPCEvents {
  'microphone-audio-data': { args: [audioData: ArrayBuffer] };
  'system-audio-data': { args: [audioData: ArrayBuffer] };
  log: {
    args: [level: 'info' | 'warn' | 'error' | 'debug', ...messages: unknown[]];
  };
}

// ============================================================================
// Type Helpers
// ============================================================================

/** All handler channel names */
export type IPCHandlerChannel = keyof IPCHandlers;

/** All event channel names */
export type IPCEventChannel = keyof IPCEvents;

/** Get argument types for a handler */
export type IPCHandlerArgs<C extends IPCHandlerChannel> =
  IPCHandlers[C]['args'];

/** Get return type for a handler */
export type IPCHandlerReturn<C extends IPCHandlerChannel> =
  IPCHandlers[C]['return'];

/** Get argument types for an event */
export type IPCEventArgs<C extends IPCEventChannel> = IPCEvents[C]['args'];

// ============================================================================
// Handler Function Types
// ============================================================================

/** Type for a handler function */
export type IPCHandlerFn<C extends IPCHandlerChannel> = (
  ...args: IPCHandlerArgs<C>
) => IPCHandlerReturn<C> | Promise<IPCHandlerReturn<C>>;

/** Type for an event listener function */
export type IPCEventFn<C extends IPCEventChannel> = (
  ...args: IPCEventArgs<C>
) => void;

// ============================================================================
// Preload API Types
// ============================================================================

/** Type for the invoker function returned by createInvoker */
export type IPCInvoker<C extends IPCHandlerChannel> = (
  ...args: IPCHandlerArgs<C>
) => Promise<IPCHandlerReturn<C>>;

/** Type for the sender function returned by createSender */
export type IPCSender<C extends IPCEventChannel> = (
  ...args: IPCEventArgs<C>
) => void;
