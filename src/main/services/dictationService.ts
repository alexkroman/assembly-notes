import robotjs from '@jitsi/robotjs';
import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import { RecordingManager } from './recordingManager.js';
import { TranscriptionService } from './transcriptionService.js';

@injectable()
export class DictationService {
  private isDictating = false;
  private keyDownTime: number | null = null;
  private transcriptionHandler: ((text: string) => void) | null = null;
  private dictationShortcut: string | null = null;

  constructor(
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
        this.dictationShortcut = shortcut;
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

    // Check if a regular recording is already in progress
    if (this.recordingManager.isRecording()) {
      log.warn('Cannot start dictation while recording is in progress');
      return;
    }

    this.isDictating = true;
    this.keyDownTime = Date.now();

    log.info('Starting dictation mode');

    // Set up transcription handler to capture text and insert it immediately
    this.transcriptionHandler = (text: string) => {
      this.handleDictationText(text);
    };

    // Subscribe to transcription events
    this.transcriptionService.onDictationText(this.transcriptionHandler);

    // Start transcription for dictation mode
    const started =
      await this.recordingManager.startTranscriptionForDictation();
    if (!started) {
      log.error('Failed to start transcription for dictation');
      this.isDictating = false;
      // Cleanup handler
      this.transcriptionService.offDictationText(this.transcriptionHandler);
      this.transcriptionHandler = null;
      return;
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

    // Unsubscribe from transcription events
    if (this.transcriptionHandler) {
      this.transcriptionService.offDictationText(this.transcriptionHandler);
      this.transcriptionHandler = null;
    }

    // Stop dictation transcription (uses proper Redux action)
    await this.recordingManager.stopTranscriptionForDictation();

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
    // Only unregister the dictation shortcut, not all shortcuts
    if (this.dictationShortcut) {
      globalShortcut.unregister(this.dictationShortcut);
      this.dictationShortcut = null;
    }
    if (this.isDictating) {
      void this.stopDictation();
    }
  }
}
