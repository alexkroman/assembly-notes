import robotjs from '@jitsi/robotjs';
import type { Store } from '@reduxjs/toolkit';
import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import type { DictationStatusWindow } from '../dictationStatusWindow.js';
import type { StateBroadcaster } from '../state-broadcaster.js';
import { RecordingManager } from './recordingManager.js';
import type { IAssemblyAIFactoryWithLemur } from './summarizationService.js';
import { TranscriptionService } from './transcriptionService.js';
import { setTransitioning } from '../store/slices/recordingSlice.js';
import type { RootState, AppDispatch } from '../store/store.js';

@injectable()
export class DictationService {
  private isDictating = false;
  private keyDownTime: number | null = null;
  private transcriptionHandler: ((text: string) => void) | null = null;
  private dictationShortcut: string | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private styleAbortController: AbortController | null = null;
  private stylePromise: Promise<void> | null = null;
  private unstyledTextBuffer: string[] = [];
  private isFirstInsertion = true;

  constructor(
    @inject(DI_TOKENS.TranscriptionService)
    private transcriptionService: TranscriptionService,
    @inject(DI_TOKENS.RecordingManager)
    private recordingManager: RecordingManager,
    @inject(DI_TOKENS.DictationStatusWindow)
    private dictationStatusWindow: DictationStatusWindow,
    @inject(DI_TOKENS.Store)
    private store: Store<RootState> & { dispatch: AppDispatch },
    @inject(DI_TOKENS.AssemblyAIFactoryWithLemur)
    private assemblyAIFactory: IAssemblyAIFactoryWithLemur,
    @inject(DI_TOKENS.StateBroadcaster)
    private stateBroadcaster: StateBroadcaster
  ) {}

  public initialize(): void {
    try {
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

    if (state.recording.isTransitioning) {
      log.info('Ignoring dictation toggle - transition in progress');
      return;
    }

    if (!state.recording.isDictating) {
      void this.startDictation();
    } else {
      void this.stopDictation();
    }
  }

  public async startDictation(): Promise<void> {
    const state = this.store.getState();

    if (state.recording.isDictating || state.recording.isTransitioning) {
      log.info('Already dictating or transitioning');
      return;
    }

    if (this.recordingManager.isRecording()) {
      log.warn('Cannot start dictation while recording is in progress');
      return;
    }

    this.store.dispatch(setTransitioning(true));
    this.stateBroadcaster.recordingTransitioning(true);

    log.info('Starting dictation mode');

    try {
      // Clear the buffer and reset first insertion flag at the start of dictation
      this.unstyledTextBuffer = [];
      this.isFirstInsertion = true;

      this.transcriptionHandler = (text: string) => {
        this.handleDictationText(text);
      };

      this.transcriptionService.onDictationText(this.transcriptionHandler);

      const started =
        await this.recordingManager.startTranscriptionForDictation();
      if (!started) {
        log.error('Failed to start transcription for dictation');
        this.transcriptionService.offDictationText(this.transcriptionHandler);
        this.transcriptionHandler = null;
        this.store.dispatch(setTransitioning(false));
        this.stateBroadcaster.recordingTransitioning(false);
        return;
      }

      this.isDictating = true;
      this.keyDownTime = Date.now();

      setTimeout(() => {
        this.notifyDictationStatus(true);
        this.store.dispatch(setTransitioning(false));
        this.stateBroadcaster.recordingTransitioning(false);
      }, 400);
    } catch (error) {
      this.store.dispatch(setTransitioning(false));
      this.stateBroadcaster.recordingTransitioning(false);
      throw error;
    }
  }

  public async stopDictation(): Promise<void> {
    const state = this.store.getState();

    if (!state.recording.isDictating || state.recording.isTransitioning) {
      log.info('Not dictating or already transitioning');
      return;
    }

    this.store.dispatch(setTransitioning(true));
    this.stateBroadcaster.recordingTransitioning(true);

    this.isDictating = false;
    this.clearSilenceTimer();

    if (this.styleAbortController) {
      this.styleAbortController.abort();
      this.styleAbortController = null;
    }

    const dictationDuration = this.keyDownTime
      ? Date.now() - this.keyDownTime
      : 0;
    log.info(
      `Stopping dictation mode (duration: ${String(dictationDuration)}ms)`
    );

    try {
      // If there's any buffered text when stopping, insert it
      if (this.unstyledTextBuffer.length > 0) {
        const bufferedText = this.unstyledTextBuffer.join(' ');
        const safeText = this.sanitizeTextForTyping(bufferedText);
        const textToInsert = this.isFirstInsertion ? safeText : ' ' + safeText;
        robotjs.typeString(textToInsert);
        log.debug(`Inserted remaining buffered text on stop: "${safeText}"`);
        this.unstyledTextBuffer = [];
        this.isFirstInsertion = false;
      }

      this.notifyDictationStatus(false);

      if (this.transcriptionHandler) {
        this.transcriptionService.offDictationText(this.transcriptionHandler);
        this.transcriptionHandler = null;
      }

      await this.recordingManager.stopTranscriptionForDictation();
    } finally {
      this.store.dispatch(setTransitioning(false));
      this.stateBroadcaster.recordingTransitioning(false);
    }
  }

  private handleDictationText(text: string): void {
    if (!this.isDictating) return;

    // Buffer text for styling (styling is always enabled)
    this.unstyledTextBuffer.push(text);
    log.debug(`Buffering text for styling: "${text}"`);

    this.resetSilenceTimer();
  }

  private resetSilenceTimer(): void {
    const settings = this.store.getState().settings;
    if (!settings.assemblyaiKey) {
      return;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    const silenceTimeout = settings.dictationSilenceTimeout || 2000;
    log.debug(`Resetting silence timer for ${String(silenceTimeout)}ms`);

    this.silenceTimer = setTimeout(() => {
      log.debug('Silence detected, triggering styling');
      void this.triggerStyling();
    }, silenceTimeout);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private async triggerStyling(): Promise<void> {
    if (!this.isDictating) {
      return;
    }

    const settings = this.store.getState().settings;
    if (!settings.assemblyaiKey) {
      return;
    }

    if (this.styleAbortController) {
      log.debug('Cancelling previous styling operation');
      this.styleAbortController.abort();
      this.styleAbortController = null;
    }

    if (this.stylePromise) {
      try {
        await this.stylePromise;
      } catch {
        // Intentionally empty - ignoring cancelled operations
      }
    }

    this.styleAbortController = new AbortController();
    const { signal } = this.styleAbortController;

    log.debug('Final transcript received, triggering styling');

    this.stylePromise = this.performStyling(signal, settings);

    try {
      await this.stylePromise;
    } catch (error) {
      if (error instanceof Error && error.message === 'AbortError') {
        log.debug('Styling operation was cancelled');
      } else {
        log.error('Failed to style text:', error);
      }
    } finally {
      // Only clear the controller if it's still the same one we created
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.styleAbortController?.signal === signal) {
        this.styleAbortController = null;
      }
      this.stylePromise = null;
    }
  }

  private async performStyling(
    signal: AbortSignal,
    settings: RootState['settings']
  ): Promise<void> {
    const throwIfAborted = (): void => {
      if (signal.aborted) {
        throw new Error('AbortError');
      }
    };

    try {
      throwIfAborted();

      // Use buffered text for styling and immediately clear the buffer
      const fullText = this.unstyledTextBuffer.join(' ').trim();
      this.unstyledTextBuffer = []; // Clear buffer immediately after capturing text

      throwIfAborted();

      if (!fullText) {
        log.debug('No buffered text to style');
        return;
      }

      log.debug(`Styling buffered text: "${fullText}"`);

      const styledText = await this.styleText(
        fullText,
        settings.dictationStylingPrompt,
        settings.assemblyaiKey,
        signal
      );
      throwIfAborted();

      if (styledText && styledText !== fullText) {
        // Insert styled text
        const safeText = this.sanitizeTextForTyping(styledText);
        const textToInsert = this.isFirstInsertion ? safeText : ' ' + safeText;
        robotjs.typeString(textToInsert);
        log.debug(`Inserted styled text: "${safeText}"`);
        this.isFirstInsertion = false;
      } else {
        // If styling failed or returned unchanged, insert the original text
        log.debug('No styling applied - inserting original text');
        const safeText = this.sanitizeTextForTyping(fullText);
        const textToInsert = this.isFirstInsertion ? safeText : ' ' + safeText;
        robotjs.typeString(textToInsert);
        this.isFirstInsertion = false;
      }
    } finally {
      // Nothing to clean up
    }
  }

  private async styleText(
    originalText: string,
    stylePrompt: string,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<string | null> {
    try {
      log.debug('Styling text with AssemblyAI Lemur:', originalText);

      const aai = await this.assemblyAIFactory.createClient(apiKey);
      const lemur = aai.lemur;

      const prompt = `Take this dictated text and rewrite it according to the following style instructions:

${stylePrompt}

Dictated text to reformat: "${originalText}"

Return ONLY the reformatted text, nothing else. No explanations, no commentary, no additional content.`;

      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      const response = await lemur.task({
        prompt,
        input_text: originalText,
        final_model: 'anthropic/claude-sonnet-4-20250514',
      });

      if (signal?.aborted) {
        throw new Error('AbortError');
      }

      log.debug('Lemur API response:', JSON.stringify(response, null, 2));

      if (response.response) {
        const styledText = response.response.replace(/^["']|["']$/g, '').trim();

        log.debug('Styled text received:', styledText);
        log.debug('Original text was:', originalText);
        log.debug('Text changed:', styledText !== originalText);

        return styledText !== originalText ? styledText : null;
      }

      log.warn('No response field in Lemur API response');
      return null;
    } catch (error) {
      if (error instanceof Error && error.message === 'AbortError') {
        log.debug('Styling operation was aborted');
        throw error;
      }
      log.error('Failed to style text with Lemur API:', error);

      log.debug('Using fallback styling for:', originalText);
      const styledText = originalText
        .split(/[.!?]+/)
        .map((sentence) => {
          const trimmed = sentence.trim();
          if (trimmed.length === 0) return '';
          return (
            trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
          );
        })
        .filter((s) => s.length > 0)
        .join('. ');

      return styledText !== originalText ? styledText + '.' : null;
    }
  }

  private sanitizeTextForTyping(text: string): string {
    // Keep only alphanumeric characters, spaces, and common punctuation
    // This prevents any control characters or special keys from being typed
    return text.replace(/[^a-zA-Z0-9\s.,!?;:'"()-]/g, '').trim();
  }

  private notifyDictationStatus(isDictating: boolean): void {
    this.dictationStatusWindow.updateStatus(isDictating);

    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length > 0 && allWindows[0]) {
      allWindows[0].webContents.send('dictation-status', isDictating);
    }
  }

  public isDictationActive(): boolean {
    return this.isDictating;
  }

  public cleanup(): void {
    if (this.dictationShortcut) {
      globalShortcut.unregister(this.dictationShortcut);
      this.dictationShortcut = null;
    }
    if (this.styleAbortController) {
      this.styleAbortController.abort();
      this.styleAbortController = null;
    }
    this.clearSilenceTimer();
    if (this.isDictating) {
      void this.stopDictation();
    }
  }
}
