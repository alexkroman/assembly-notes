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
      },
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
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
