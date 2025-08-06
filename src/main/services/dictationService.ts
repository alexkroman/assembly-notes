import robotjs from '@jitsi/robotjs';
import type { Store } from '@reduxjs/toolkit';
import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import type { DictationStatusWindow } from '../dictationStatusWindow.js';
import { RecordingManager } from './recordingManager.js';
import { TranscriptionService } from './transcriptionService.js';
import { setTransitioning } from '../store/slices/recordingSlice.js';
import type { RootState, AppDispatch } from '../store/store.js';

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
    private recordingManager: RecordingManager,
    @inject(DI_TOKENS.DictationStatusWindow)
    private dictationStatusWindow: DictationStatusWindow,
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch }
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
    const state = this.store.getState();

    // Prevent toggle if we're in transition
    if (state.recording.isTransitioning) {
      log.info('Ignoring dictation toggle - transition in progress');
      return;
    }

    // Check current dictation state from Redux
    if (!state.recording.isDictating) {
      void this.startDictation();
    } else {
      void this.stopDictation();
    }
  }

  public async startDictation(): Promise<void> {
    const state = this.store.getState();

    // Check Redux state for dictation and transition status
    if (state.recording.isDictating || state.recording.isTransitioning) {
      log.info('Already dictating or transitioning');
      return;
    }

    // Check if a regular recording is already in progress
    if (this.recordingManager.isRecording()) {
      log.warn('Cannot start dictation while recording is in progress');
      return;
    }

    // Set transitioning to true at the start
    this.store.dispatch(setTransitioning(true));

    log.info('Starting dictation mode');

    try {
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
        // Cleanup handler
        this.transcriptionService.offDictationText(this.transcriptionHandler);
        this.transcriptionHandler = null;
        // Clear transitioning state on failure
        this.store.dispatch(setTransitioning(false));
        return;
      }

      // Only set isDictating and notify after successful start
      this.isDictating = true;
      this.keyDownTime = Date.now();

      // Add 300ms delay before notifying to account for recording startup time
      // and clear transitioning state after the delay
      setTimeout(() => {
        // Notify renderer about dictation mode
        this.notifyDictationStatus(true);
        // Clear transitioning state after notification
        this.store.dispatch(setTransitioning(false));
      }, 400);
    } catch (error) {
      // Clear transitioning state on error
      this.store.dispatch(setTransitioning(false));
      throw error;
    }
  }

  public async stopDictation(): Promise<void> {
    const state = this.store.getState();

    // Check Redux state for dictation and transition status
    if (!state.recording.isDictating || state.recording.isTransitioning) {
      log.info('Not dictating or already transitioning');
      return;
    }

    // Set transitioning to true at the start
    this.store.dispatch(setTransitioning(true));

    this.isDictating = false;

    const dictationDuration = this.keyDownTime
      ? Date.now() - this.keyDownTime
      : 0;
    log.info(
      `Stopping dictation mode (duration: ${String(dictationDuration)}ms)`
    );

    try {
      // Notify renderer about dictation mode IMMEDIATELY
      this.notifyDictationStatus(false);

      // Unsubscribe from transcription events
      if (this.transcriptionHandler) {
        this.transcriptionService.offDictationText(this.transcriptionHandler);
        this.transcriptionHandler = null;
      }

      // Stop dictation transcription (uses proper Redux action)
      // This includes all audio cleanup
      await this.recordingManager.stopTranscriptionForDictation();
    } finally {
      // Clear transitioning state after all audio cleanup is complete
      this.store.dispatch(setTransitioning(false));
    }
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
    // Update the dictation status window FIRST for immediate visual feedback
    this.dictationStatusWindow.updateStatus(isDictating);

    // Then send status to main window for Redux state (to prevent navigation)
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length > 0 && allWindows[0]) {
      allWindows[0].webContents.send('dictation-status', isDictating);
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
