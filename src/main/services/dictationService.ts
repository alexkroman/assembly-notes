import robotjs from '@jitsi/robotjs';
import type { Store } from '@reduxjs/toolkit';
import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import { RecordingManager } from './recordingManager.js';
import { TranscriptionService } from './transcriptionService.js';
import { setDictationMode } from '../store/slices/recordingSlice.js';
import type { AppDispatch, RootState } from '../store/store.js';

@injectable()
export class DictationService {
  private isDictating = false;
  private keyDownTime: number | null = null;
  private transcriptionHandler: ((text: string) => void) | null = null;

  constructor(
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.TranscriptionService)
    private transcriptionService: TranscriptionService,
    @inject(DI_TOKENS.RecordingManager)
    private recordingManager: RecordingManager
  ) {}

  public initialize(): void {
    try {
      // Register Control+Option+D (macOS) or Ctrl+Alt+D (Windows/Linux) for dictation toggle
      const shortcut =
        process.platform === 'darwin' ? 'Control+Option+D' : 'Ctrl+Alt+D';
      const registered = globalShortcut.register(shortcut, () => {
        this.handleDictationToggle();
      });

      if (registered) {
        log.info(`Registered ${shortcut} for dictation mode toggle`);
      } else {
        log.warn(`Failed to register ${shortcut} shortcut for dictation`);
      }
    } catch (error) {
      log.error('Failed to initialize dictation service:', error);
    }
  }

  private handleDictationToggle(): void {
    if (!this.isDictating) {
      void this.startDictation();
    } else {
      void this.stopDictation();
    }
  }

  public async startDictation(): Promise<void> {
    if (this.isDictating) return;

    this.isDictating = true;
    this.keyDownTime = Date.now();

    log.info('Starting dictation mode');

    // Update Redux state
    this.store.dispatch(setDictationMode(true));

    // Set up transcription handler to capture text and insert it immediately
    this.transcriptionHandler = (text: string) => {
      this.handleDictationText(text);
    };

    // Subscribe to transcription events
    this.transcriptionService.onDictationText(this.transcriptionHandler);

    // Start recording if not already recording
    if (!this.recordingManager.isRecording()) {
      // Start transcription without creating a database recording
      const started =
        await this.recordingManager.startTranscriptionForDictation();
      if (!started) {
        log.error('Failed to start transcription for dictation');
        this.isDictating = false;
        this.store.dispatch(setDictationMode(false));
        return;
      }
    }

    // Notify renderer about dictation mode
    this.notifyDictationStatus(true);
  }

  public async stopDictation(): Promise<void> {
    if (!this.isDictating) return;

    this.isDictating = false;

    const dictationDuration = this.keyDownTime
      ? Date.now() - this.keyDownTime
      : 0;
    log.info(
      `Stopping dictation mode (duration: ${String(dictationDuration)}ms)`
    );

    // Update Redux state
    this.store.dispatch(setDictationMode(false));

    // Unsubscribe from transcription events
    if (this.transcriptionHandler) {
      this.transcriptionService.offDictationText(this.transcriptionHandler);
      this.transcriptionHandler = null;
    }

    // Stop recording if it was started for dictation
    await this.recordingManager.stopTranscription();

    // Notify renderer about dictation mode
    this.notifyDictationStatus(false);
  }

  private handleDictationText(text: string): void {
    if (!this.isDictating) return;

    // For final transcripts, insert the complete text with a space after
    // Each final represents a complete sentence or phrase
    try {
      // Insert the final text followed by a space
      robotjs.typeString(text + ' ');
      log.debug(`Inserted final text: "${text} "`);
    } catch (error) {
      log.error('Failed to insert text in real-time:', error);
    }
  }

  private notifyDictationStatus(isDictating: boolean): void {
    // Send status to renderer via IPC
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('dictation-status', isDictating);
    }
  }

  public isDictationActive(): boolean {
    return this.isDictating;
  }

  public cleanup(): void {
    globalShortcut.unregisterAll();
    if (this.isDictating) {
      void this.stopDictation();
    }
  }
}
