import posthog, { type PostHog } from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import React from 'react';

// Check if we're in a test environment
const isTestEnvironment =
  import.meta.env.MODE === 'test' ||
  (typeof window !== 'undefined' && '__TEST_MODE__' in window);

// Initialize PostHog only in non-test environments
let posthogInstance: PostHog | undefined;

if (!isTestEnvironment && typeof window !== 'undefined') {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const apiHost =
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (apiKey) {
    posthogInstance = posthog.init(apiKey, {
      api_host: apiHost,
      loaded: (ph) => {
        if (import.meta.env.MODE === 'development') {
          ph.debug();
        }

        // Set up global error handlers for automatic error tracking
        if (typeof window !== 'undefined') {
          // Capture unhandled errors
          window.addEventListener('error', (event: ErrorEvent) => {
            const error = event.error as Error | undefined;
            ph.capture('$exception', {
              error_message: event.message,
              error_stack: error?.stack,
              error_filename: event.filename,
              error_lineno: event.lineno,
              error_colno: event.colno,
              error_type: error?.name ?? 'Error',
              source: 'window.error',
            });
          });

          // Capture unhandled promise rejections
          window.addEventListener(
            'unhandledrejection',
            (event: PromiseRejectionEvent) => {
              const reason = event.reason as Error | undefined;
              ph.capture('$exception', {
                error_message: reason?.message ?? String(event.reason),
                error_stack: reason?.stack,
                error_type: reason?.name ?? 'UnhandledPromiseRejection',
                source: 'unhandledrejection',
              });
            }
          );
        }
      },
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      // Enable automatic error tracking
      capture_performance: true,
      // Sanitize sensitive data from errors
      sanitize_properties: (properties, event) => {
        // Remove any API keys or tokens from error data
        if (event === '$exception' && properties['error_stack']) {
          const stack = properties['error_stack'] as unknown;
          if (typeof stack === 'string') {
            properties['error_stack'] = stack
              .replace(
                /api[_-]?key["\s:=]+["']?[\w-]+["']?/gi,
                'api_key=REDACTED'
              )
              .replace(/token["\s:=]+["']?[\w-]+["']?/gi, 'token=REDACTED');
          }
        }
        return properties;
      },
    });
  } else {
    console.warn('PostHog API key not found. Analytics will be disabled.');
  }
}

// Create a safe wrapper that handles undefined posthog
const safePostHog: PostHog =
  posthogInstance ??
  ({
    identify: () => undefined,
    capture: () => undefined,
    reset: () => undefined,
    setPersonProperties: () => undefined,
    group: () => undefined,
    setGroupProperties: () => undefined,
    // Add other methods as needed, all returning undefined or no-op
  } as unknown as PostHog);

// Export the safe PostHog instance for direct use
export { safePostHog as posthog };

// Custom PostHog Provider that handles test environments
export const PostHogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // In test environment or when PostHog is not initialized, just render children
  if (isTestEnvironment || !posthogInstance) {
    return <>{children}</>;
  }

  // In production/development, use the actual PostHog Provider with the client
  return <PHProvider client={posthogInstance}>{children}</PHProvider>;
};
