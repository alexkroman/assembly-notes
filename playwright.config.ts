import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '__tests__/e2e',
  timeout: 60000, // Increased timeout for Electron tests
  retries: 2,
  workers: 1, // Run tests serially for Electron
  use: {
    // Global test timeout
    actionTimeout: 15000, // Increased action timeout
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.test.ts',
    },
  ],
  // Configure for CI environments (especially Ubuntu)
  webServer: process.env.CI ? undefined : undefined,
});
