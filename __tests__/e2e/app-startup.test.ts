import { _electron as electron } from 'playwright';
import { ElectronApplication, Page } from 'playwright';

import { test, expect } from './setup';

test.describe('App Startup', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Ensure TypeScript is built before running tests
    const { spawn } = await import('child_process');

    console.log('Building TypeScript before e2e tests...');
    try {
      await new Promise((resolve, reject) => {
        const buildProcess = spawn('npm', ['run', 'build:main'], {
          stdio: 'inherit',
          shell: true,
        });
        buildProcess.on('close', (code) => {
          if (code === 0) {
            console.log('TypeScript build completed successfully');
            resolve(code);
          } else {
            reject(
              new Error(`Build failed with code ${String(code ?? 'unknown')}`)
            );
          }
        });
        buildProcess.on('error', reject);
      });
    } catch (buildError) {
      console.error('Failed to build TypeScript:', buildError);
      throw buildError;
    }

    try {
      // Skip e2e tests on Ubuntu CI environment where they consistently fail
      if (process.platform === 'linux' && process.env['CI']) {
        console.log('Skipping e2e tests on Ubuntu CI environment');
        test.skip(
          true,
          'E2E tests disabled on Ubuntu CI due to xvfb/display issues'
        );
        return;
      }

      // Launch Electron app
      electronApp = await electron.launch({
        args: [
          './dist/main/main.js',
          // Disable sandbox for CI environments (especially Ubuntu)
          ...(process.platform === 'linux'
            ? [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--headless',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
              ]
            : ['--no-sandbox', '--disable-gpu', '--no-first-run']),
        ],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          // Ubuntu CI environment variables
          DISPLAY: process.env['DISPLAY'] || ':99',
          XVFB_WHD: '1280x720x16',
        },
        cwd: process.cwd(),
        timeout: 30000,
      });

      // Get the first window that the app opens
      page = await electronApp.firstWindow();
    } catch (error) {
      console.error('Failed to launch Electron app:', error);
      electronApp = null as any;
      throw error;
    }
  });

  test.afterAll(async () => {
    // Close the app only if it was successfully launched
    if (electronApp && typeof electronApp.close === 'function') {
      try {
        await electronApp.close();
      } catch (error) {
        console.error('Error closing Electron app:', error);
      }
    }
  });

  test('should launch app successfully without errors', async () => {
    // Skip test if app failed to launch
    test.skip(!electronApp, 'Electron app failed to launch');

    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Wait for React to render and app to initialize
    await page.waitForTimeout(3000);

    // Check that the app window is visible and has correct title
    await expect(page).toHaveTitle('AssemblyAI Notes');

    // Check for main UI elements to confirm successful startup
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });

    // Filter out common non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('DevTools') &&
        !error.includes('favicon') &&
        !error.includes('chrome-extension')
    );

    // Should not have any critical startup errors
    expect(criticalErrors).toHaveLength(0);
  });
});
