/**
 * StateBroadcaster Service
 *
 * Broadcasts state changes from the main process to renderer(s) via IPC.
 * Replaces electron-redux synchronization with explicit IPC events.
 */

import { BrowserWindow } from 'electron';
import Logger from 'electron-log';
import { inject, injectable } from 'tsyringe';

import { DI_TOKENS } from './di-tokens.js';
import type { Recording, UpdateInfo } from '../types/common.js';
import {
  IPC_STATE_CHANNELS,
  type IPCStateChannel,
  type IPCStatePayloads,
} from '../types/ipc-events.js';
import type {
  RecordingStatus,
  TranscriptSegment,
  SettingsState,
} from '../types/redux.js';

@injectable()
export class StateBroadcaster {
  constructor(
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger
  ) {}

  /**
   * Generic broadcast method for type-safe IPC events
   */
  broadcast<K extends IPCStateChannel>(
    channel: K,
    payload: K extends keyof IPCStatePayloads ? IPCStatePayloads[K] : never
  ): void {
    if (this.mainWindow.isDestroyed()) {
      this.logger.warn(`Cannot broadcast ${channel}: window is destroyed`);
      return;
    }
    this.mainWindow.webContents.send(channel, payload);
  }

  // ==================== Recording State ====================

  recordingStatus(
    status: RecordingStatus,
    options?: {
      recordingId?: string | null;
      startTime?: number | null;
      error?: string | null;
    }
  ): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDING_STATUS, {
      status,
      ...options,
    });
  }

  recordingConnection(
    stream: 'microphone' | 'system',
    connected: boolean
  ): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDING_CONNECTION, {
      stream,
      connected,
    });
  }

  recordingError(error: string): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDING_ERROR, { error });
  }

  recordingDictation(isDictating: boolean): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDING_DICTATION, { isDictating });
  }

  recordingTransitioning(isTransitioning: boolean): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDING_TRANSITIONING, {
      isTransitioning,
    });
  }

  recordingReset(): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDING_RESET, {});
  }

  // ==================== Transcription State ====================

  transcriptionSegment(segment: TranscriptSegment): void {
    this.broadcast(IPC_STATE_CHANNELS.TRANSCRIPTION_SEGMENT, segment);
  }

  transcriptionBuffer(source: 'microphone' | 'system', text: string): void {
    this.broadcast(IPC_STATE_CHANNELS.TRANSCRIPTION_BUFFER, { source, text });
  }

  transcriptionError(error: string): void {
    this.broadcast(IPC_STATE_CHANNELS.TRANSCRIPTION_ERROR, { error });
  }

  transcriptionClear(): void {
    this.broadcast(IPC_STATE_CHANNELS.TRANSCRIPTION_CLEAR, {});
  }

  transcriptionLoad(transcript: string): void {
    this.broadcast(IPC_STATE_CHANNELS.TRANSCRIPTION_LOAD, { transcript });
  }

  // ==================== Settings State ====================

  settingsUpdated(settings: Partial<SettingsState>): void {
    this.broadcast(IPC_STATE_CHANNELS.SETTINGS_UPDATED, settings);
  }

  // ==================== Update State ====================

  updateChecking(): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_CHECKING, {});
  }

  updateAvailable(updateInfo: UpdateInfo): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_AVAILABLE, { updateInfo });
  }

  updateNotAvailable(): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_NOT_AVAILABLE, {});
  }

  updateDownloading(): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_DOWNLOADING, {});
  }

  updateProgress(percent: number): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_PROGRESS, { percent });
  }

  updateDownloaded(updateInfo: UpdateInfo): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_DOWNLOADED, { updateInfo });
  }

  updateError(error: string): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_ERROR, { error });
  }

  updateReset(): void {
    this.broadcast(IPC_STATE_CHANNELS.UPDATE_RESET, {});
  }

  // ==================== Recordings State ====================

  recordingsCurrent(recording: Recording | null): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDINGS_CURRENT, { recording });
  }

  recordingsTitle(title: string): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDINGS_TITLE, { title });
  }

  recordingsSummary(summary: string): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDINGS_SUMMARY, { summary });
  }

  recordingsTranscript(transcript: string): void {
    this.broadcast(IPC_STATE_CHANNELS.RECORDINGS_TRANSCRIPT, { transcript });
  }
}
