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
  private speechActivityHandler: (() => void) | null = null;
  private dictationShortcut: string | null = null;
  private dictationBuffer = '';
  private silenceTimer: NodeJS.Timeout | null = null;
  private isProcessingStyle = false;
  private lastTranscriptTime = 0;

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
      // Set up transcription handler to capture text and handle styling
      this.transcriptionHandler = (text: string) => {
        this.handleDictationText(text);
      };

      // Set up speech activity handler to track any voice activity
      this.speechActivityHandler = () => {
        this.handleSpeechActivity();
      };

      // Subscribe to transcription events
      this.transcriptionService.onDictationText(this.transcriptionHandler);
      this.transcriptionService.onSpeechActivity(this.speechActivityHandler);

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
      this.dictationBuffer = '';
      this.isProcessingStyle = false;
      this.lastTranscriptTime = 0;

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
    this.dictationBuffer = '';
    this.isProcessingStyle = false;
    this.lastTranscriptTime = 0;
    this.clearSilenceTimer();

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
      if (this.speechActivityHandler) {
        this.transcriptionService.offSpeechActivity(this.speechActivityHandler);
        this.speechActivityHandler = null;
      }

      // Stop dictation transcription (uses proper Redux action)
      // This includes all audio cleanup
      await this.recordingManager.stopTranscriptionForDictation();
    } finally {
      // Clear transitioning state after all audio cleanup is complete
      this.store.dispatch(setTransitioning(false));
    }
  }

  private handleSpeechActivity(): void {
    if (!this.isDictating) return;

    const now = Date.now();
    // Update last speech time - this tracks ANY voice activity (partials + finals)
    this.lastTranscriptTime = now;

    const settings = this.store.getState().settings;

    // If styling is enabled, restart silence detection timer on ANY speech activity
    if (
      settings.dictationStylingEnabled &&
      settings.assemblyaiKey &&
      !this.isProcessingStyle
    ) {
      this.clearSilenceTimer();
      log.debug(
        `Speech activity detected, restarting ${String(settings.dictationSilenceTimeout)}ms silence timer`
      );

      // Start a timer that will check for silence after the timeout
      this.silenceTimer = setTimeout(() => {
        this.checkForActualSilence(settings.dictationSilenceTimeout);
      }, settings.dictationSilenceTimeout);
    }
  }

  private handleDictationText(text: string): void {
    if (!this.isDictating) return;

    // Add text to buffer for potential styling
    this.dictationBuffer += (this.dictationBuffer ? ' ' : '') + text;

    try {
      // Insert the final text followed by a space
      robotjs.typeString(text + ' ');
      log.debug(
        `Inserted final text: "${text}", buffer now: "${this.dictationBuffer}"`
      );
    } catch (error) {
      log.error('Failed to insert text in real-time:', error);
    }
  }

  private checkForActualSilence(requiredSilenceDuration: number): void {
    const now = Date.now();
    const timeSinceLastTranscript = now - this.lastTranscriptTime;

    log.debug(
      `Checking silence: ${String(timeSinceLastTranscript)}ms since last transcript (need ${String(requiredSilenceDuration)}ms)`
    );

    if (timeSinceLastTranscript >= requiredSilenceDuration) {
      // We have actual silence - trigger styling
      log.debug('Confirmed silence detected, triggering styling');
      void this.handleSilenceTimeout();
    } else {
      // Not enough silence yet - set another timer for the remaining time
      const remainingTime = requiredSilenceDuration - timeSinceLastTranscript;
      log.debug(
        `Not enough silence yet, checking again in ${String(remainingTime)}ms`
      );

      this.clearSilenceTimer();
      this.silenceTimer = setTimeout(() => {
        this.checkForActualSilence(requiredSilenceDuration);
      }, remainingTime);
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private async handleSilenceTimeout(): Promise<void> {
    if (
      !this.isDictating ||
      !this.dictationBuffer.trim() ||
      this.isProcessingStyle
    ) {
      return;
    }

    const settings = this.store.getState().settings;
    if (!settings.dictationStylingEnabled || !settings.assemblyaiKey) {
      return;
    }

    // Set processing flag to prevent multiple simultaneous requests
    this.isProcessingStyle = true;
    const textToStyle = this.dictationBuffer.trim();

    log.debug(`Silence detected, styling text: "${textToStyle}"`);

    try {
      const styledText = await this.styleText(
        textToStyle,
        settings.dictationStylingPrompt,
        settings.assemblyaiKey
      );

      if (styledText && styledText !== textToStyle) {
        // Replace the original text with styled text
        await this.replaceTextWithStyled(textToStyle, styledText);
        log.debug(`Replaced with styled text: "${styledText}"`);
      }
    } catch (error) {
      log.error('Failed to style dictation text:', error);
    } finally {
      // Clear buffer and processing flag after completion
      this.dictationBuffer = '';
      this.isProcessingStyle = false;
    }
  }

  private async styleText(
    originalText: string,
    stylePrompt: string,
    apiKey: string
  ): Promise<string | null> {
    try {
      log.debug('Styling text with Claude API:', originalText);

      // Use direct Anthropic Claude API for text styling
      const { Anthropic } = await import('@anthropic-ai/sdk');

      // We'll reuse the AssemblyAI API key as a proxy - in a production app,
      // you'd want a separate Anthropic API key setting
      // For now, this is a demo showing the integration pattern
      const anthropic = new Anthropic({
        apiKey: process.env['ANTHROPIC_API_KEY'] ?? apiKey, // Use env var if available, fallback to AssemblyAI key
      });

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Take this dictated text and rewrite it according to the following style instructions:

${stylePrompt}

Dictated text to reformat: "${originalText}"

Return ONLY the reformatted text, nothing else. No explanations, no commentary, no additional content.`,
          },
        ],
      });

      if (response.content[0]?.type === 'text') {
        const styledText = response.content[0].text
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .trim();

        log.debug('Styled text received:', styledText);
        return styledText !== originalText ? styledText : null;
      }

      return null;
    } catch (error) {
      log.error('Failed to style text with Claude API:', error);

      // Fallback to simple capitalization if API fails
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

  private async replaceTextWithStyled(
    originalText: string,
    styledText: string
  ): Promise<void> {
    try {
      log.debug(`Replacing "${originalText.trim()}" with "${styledText}"`);

      // Select all text and replace with styled version - much faster than character-by-character deletion
      robotjs.keyTap('a', process.platform === 'darwin' ? ['cmd'] : ['ctrl']); // Select all

      // Small delay to ensure selection is processed
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Type the styled text (this will replace the selected text)
      robotjs.typeString(styledText + ' ');
    } catch (error) {
      log.error('Failed to replace text with styled version:', error);
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
    this.clearSilenceTimer();
    if (this.isDictating) {
      void this.stopDictation();
    }
  }
}
