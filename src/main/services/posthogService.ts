import os from 'os';

import { app } from 'electron';
import log from 'electron-log';
import { PostHog } from 'posthog-node';
import { injectable } from 'tsyringe';

/**
 * Error context for tracking errors with additional metadata
 */
export interface ErrorContext {
  /** The service or component where the error occurred */
  service: string;
  /** The operation being performed when the error occurred */
  operation: string;
  /** Whether the error is fatal/unrecoverable */
  fatal?: boolean;
  /** Additional properties to include with the error */
  [key: string]: unknown;
}

@injectable()
export class PostHogService {
  private client: PostHog | null = null;
  private isInitialized = false;
  private userId: string | null = null;

  constructor() {
    // Don't initialize PostHog in test environment
    if (process.env['NODE_ENV'] !== 'test') {
      this.initialize();
    }
  }

  private initialize(): void {
    const apiKey = process.env['VITE_PUBLIC_POSTHOG_KEY'];
    const apiHost =
      process.env['VITE_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com';

    if (!apiKey) {
      log.warn(
        'PostHog API key not found. Backend analytics will be disabled.'
      );
      return;
    }

    try {
      this.client = new PostHog(apiKey, {
        host: apiHost,
        flushAt: 20,
        flushInterval: 10000,
      });

      this.isInitialized = true;

      // Set up global error handlers
      this.setupErrorHandlers();

      // Capture app startup event
      this.captureEvent('app_started', {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
        electron_version: process.versions.electron,
        os_release: os.release(),
      });

      log.info('PostHog backend analytics initialized');
    } catch (error) {
      log.error('Failed to initialize PostHog:', error);
    }
  }

  /**
   * Set the user ID for tracking (called when settings are loaded)
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    if (this.client && this.isInitialized) {
      this.client.identify({
        distinctId: userId,
        properties: {
          app_version: app.getVersion(),
          platform: process.platform,
        },
      });
    }
  }

  private setupErrorHandlers(): void {
    // Capture unhandled errors without interfering with Electron's default behavior
    process.on('uncaughtException', (error: Error) => {
      log.error('Uncaught Exception:', error);
      this.captureException(error, {
        source: 'uncaughtException',
        fatal: true,
      });
      // Let Electron handle the crash naturally - don't call process.exit
    });

    // Capture unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      log.error('Unhandled Promise Rejection:', error);
      this.captureException(error, {
        source: 'unhandledRejection',
      });
    });

    // Capture warnings
    process.on('warning', (warning: Error) => {
      log.warn('Process Warning:', warning);
      this.captureEvent('process_warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      });
    });
  }

  /**
   * Track an error with context - call this alongside logger.error()
   *
   * @example
   * this.logger.error('Failed to save recording:', error);
   * this.posthog.trackError(error, {
   *   service: 'RecordingDataService',
   *   operation: 'saveRecording',
   *   recordingId: id,
   * });
   */
  public trackError(error: unknown, context: ErrorContext): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.captureException(err, {
      ...context,
      error_context: `${context.service}.${context.operation}`,
    });
  }

  public captureException(
    error: Error,
    additionalProperties?: Record<string, unknown>
  ): void {
    if (!this.client || !this.isInitialized) return;

    // Sanitize error stack to remove sensitive data
    const sanitizedStack = this.sanitizeErrorStack(error.stack);

    this.client.capture({
      distinctId: this.getDistinctId(),
      event: '$exception',
      properties: {
        $exception_message: error.message,
        $exception_type: error.name,
        $exception_stack_trace_raw: sanitizedStack,
        error_message: error.message,
        error_name: error.name,
        error_stack: sanitizedStack,
        app_version: app.getVersion(),
        platform: process.platform,
        timestamp: new Date().toISOString(),
        ...additionalProperties,
      },
    });
  }

  public captureEvent(
    eventName: string,
    properties?: Record<string, unknown>
  ): void {
    if (!this.client || !this.isInitialized) return;

    this.client.capture({
      distinctId: this.getDistinctId(),
      event: eventName,
      properties: {
        app_version: app.getVersion(),
        platform: process.platform,
        timestamp: new Date().toISOString(),
        ...properties,
      },
    });
  }

  private sanitizeErrorStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    return stack
      .replace(/api[_-]?key["\s:=]+["']?[\w-]+["']?/gi, 'api_key=REDACTED')
      .replace(/token["\s:=]+["']?[\w-]+["']?/gi, 'token=REDACTED')
      .replace(/password["\s:=]+["']?[\w-]+["']?/gi, 'password=REDACTED')
      .replace(/secret["\s:=]+["']?[\w-]+["']?/gi, 'secret=REDACTED');
  }

  private getDistinctId(): string {
    // Use the user ID if available, otherwise fall back to machine ID
    if (this.userId) {
      return this.userId;
    }
    return `electron-${process.platform}-${app.getVersion()}`;
  }

  public shutdown(): void {
    if (this.client && this.isInitialized) {
      try {
        // PostHog's shutdown method is synchronous but non-blocking
        // It triggers the flush in background with a timeout
        void this.client.shutdown(3000); // 3 second timeout
        this.isInitialized = false;
      } catch (error) {
        log.error('Error during PostHog shutdown:', error);
      }
    }
  }
}
