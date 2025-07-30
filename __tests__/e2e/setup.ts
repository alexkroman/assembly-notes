import { test as base } from '@playwright/test';

// Extend the base test to include setup
export const test = base.extend({
  page: async ({ page }, use) => {
    // Set up console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Page error:', msg.text());
      }
    });

    // Set up request/response logging for debugging API calls
    page.on('request', (request) => {
      if (
        request.url().includes('assemblyai.com') ||
        request.url().includes('slack.com')
      ) {
        console.log('API Request:', request.method(), request.url());
      }
    });

    page.on('response', (response) => {
      if (
        response.url().includes('assemblyai.com') ||
        response.url().includes('slack.com')
      ) {
        console.log('API Response:', response.status(), response.url());
      }
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
