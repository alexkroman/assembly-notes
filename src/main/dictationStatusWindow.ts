import path from 'path';
import { fileURLToPath } from 'url';

import { BrowserWindow, screen } from 'electron';
import { injectable } from 'tsyringe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class DictationStatusWindow {
  private window: BrowserWindow | null = null;

  create(): void {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    const { width: screenWidth, height: screenHeight } =
      screen.getPrimaryDisplay().workAreaSize;
    const windowHeight = 40;
    const windowWidth = 250;

    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: screenHeight - windowHeight,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      focusable: false,
      webPreferences: {
        preload: path.join(
          __dirname,
          '..',
          'preload',
          'dictation-status-preload.js'
        ),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setAlwaysOnTop(true, 'floating');

    const htmlPath = path.join(
      __dirname,
      '..',
      'renderer',
      'dictation-status.html'
    );
    void this.window.loadFile(htmlPath);

    // Open DevTools in development mode for debugging
    if (process.env['DEV_MODE'] === 'true') {
      this.window.webContents.openDevTools({ mode: 'detach' });
    }

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  updateStatus(isDictating: boolean): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('dictation-status-update', isDictating);
    }
  }

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
    }
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}
