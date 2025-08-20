import type { PostHog } from 'posthog-js';
import { usePostHog as usePostHogOriginal } from 'posthog-js/react';

import { posthog } from '../services/posthog';

// Custom hook that safely returns PostHog instance
export const usePostHog = (): PostHog => {
  // Try to use the React hook if available (when inside PostHogProvider)
  try {
    return usePostHogOriginal();
  } catch {
    // Hook not available (not inside provider or test environment)
    // Fall back to our posthog instance (which might be a mock)
    return posthog;
  }
};
