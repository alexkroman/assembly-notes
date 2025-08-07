import robotjs from '@jitsi/robotjs';
import type { Store } from '@reduxjs/toolkit';
import { globalShortcut, BrowserWindow, clipboard } from 'electron';
import log from 'electron-log';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import type { DictationStatusWindow } from '../dictationStatusWindow.js';
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
  private dictationBuffer = '';
  private styleAbortController: AbortController | null = null;
  private stylePromise: Promise<void> | null = null;

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
    private assemblyAIFactory: IAssemblyAIFactoryWithLemur
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

    log.info('Starting dictation mode');

    try {
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
        return;
      }

      this.isDictating = true;
      this.keyDownTime = Date.now();
      this.dictationBuffer = '';

      setTimeout(() => {
        this.notifyDictationStatus(true);
        this.store.dispatch(setTransitioning(false));
      }, 400);
    } catch (error) {
      this.store.dispatch(setTransitioning(false));
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

    this.isDictating = false;
    this.dictationBuffer = '';

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
      this.notifyDictationStatus(false);

      if (this.transcriptionHandler) {
        this.transcriptionService.offDictationText(this.transcriptionHandler);
        this.transcriptionHandler = null;
      }

      await this.recordingManager.stopTranscriptionForDictation();
    } finally {
      this.store.dispatch(setTransitioning(false));
    }
  }

  private handleDictationText(text: string): void {
    if (!this.isDictating) return;

    this.dictationBuffer += (this.dictationBuffer ? ' ' : '') + text;

    try {
      robotjs.typeString(text + ' ');
      log.debug(
        `Inserted final text: "${text}", buffer now: "${this.dictationBuffer}"`
      );

      void this.triggerStyling();
    } catch (error) {
      log.error('Failed to insert text in real-time:', error);
    }
  }

  private async triggerStyling(): Promise<void> {
    if (!this.isDictating) {
      return;
    }

    const settings = this.store.getState().settings;
    if (!settings.dictationStylingEnabled || !settings.assemblyaiKey) {
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
      if (error instanceof Error && error.name === 'AbortError') {
        log.debug('Styling operation was cancelled');
      } else {
        log.error('Failed to style text:', error);
      }
    } finally {
      if (this.styleAbortController.signal === signal) {
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

      const allText = await this.getAllTextFromTextBox();
      throwIfAborted();

      if (!allText.trim()) {
        log.debug('No text found in text box to style');
        return;
      }

      log.debug(`Styling entire text box content: "${allText}"`);

      const styledText = await this.styleText(
        allText,
        settings.dictationStylingPrompt,
        settings.assemblyaiKey,
        signal
      );
      throwIfAborted();

      if (styledText && styledText !== allText) {
        await this.replaceAllTextWithStyled(styledText);
        log.debug(`Replaced entire text box with styled text: "${styledText}"`);
      } else {
        log.debug('No styling applied - styled text was null or unchanged');
        log.debug('styledText:', styledText);
        log.debug('allText:', allText);
      }
    } finally {
      this.dictationBuffer = '';
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

  private async getAllTextFromTextBox(): Promise<string> {
    try {
      robotjs.keyTap(
        'a',
        process.platform === 'darwin' ? ['command'] : ['control']
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      robotjs.keyTap(
        'c',
        process.platform === 'darwin' ? ['command'] : ['control']
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const text = clipboard.readText();

      log.debug(`Got text from text box: "${text}"`);
      return text;
    } catch (error) {
      log.error('Failed to get text from text box:', error);
      return '';
    }
  }

  private async replaceAllTextWithStyled(styledText: string): Promise<void> {
    try {
      log.debug(`Replacing all text with styled version: "${styledText}"`);

      robotjs.keyTap(
        'a',
        process.platform === 'darwin' ? ['command'] : ['control']
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      robotjs.keyTap('backspace');

      await new Promise((resolve) => setTimeout(resolve, 50));

      robotjs.typeString(styledText);

      log.debug('Successfully replaced all text with styled version');
    } catch (error) {
      log.error('Failed to replace text with styled version:', error);
    }
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
    if (this.isDictating) {
      void this.stopDictation();
    }
  }
}
