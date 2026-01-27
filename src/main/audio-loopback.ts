/**
 * Audio Loopback Module
 *
 * Vendored and modified from electron-audio-loopback v1.0.6
 * https://github.com/alectrocute/electron-audio-loopback
 *
 * Changes from original:
 * - Added cleanup() function to properly release resources on app quit
 * - Added isEnabled() to check current state
 * - Converted to TypeScript with ES modules
 * - Integrated with app lifecycle for automatic cleanup
 */

import { app, desktopCapturer, ipcMain, session } from 'electron';

// IPC event names
const IPC_EVENTS = {
  enableLoopbackAudio: 'enable-loopback-audio',
  disableLoopbackAudio: 'disable-loopback-audio',
} as const;

// Feature flags for enabling system audio loopback
const FEATURE_FLAGS = {
  pulseaudioLoopbackForScreenShare: 'PulseaudioLoopbackForScreenShare',
  macLoopbackAudioForScreenShare: 'MacLoopbackAudioForScreenShare',
  macScreenCaptureKitOverride: 'MacSckSystemAudioLoopbackOverride',
} as const;

// Loopback audio types
const LOOPBACK_AUDIO_TYPES = {
  loopback: 'loopback',
  loopbackWithMute: 'loopbackWithMute',
} as const;

// Track whether loopback is currently enabled
let loopbackEnabled = false;

/**
 * Check if loopback audio is currently enabled
 */
export function isLoopbackEnabled(): boolean {
  return loopbackEnabled;
}

/**
 * Disable loopback audio and clean up resources
 * Safe to call multiple times
 */
export function cleanup(): void {
  if (loopbackEnabled) {
    session.defaultSession.setDisplayMediaRequestHandler(null);
    loopbackEnabled = false;
  }
}

/**
 * Initialize the audio loopback module
 * Must be called before app.whenReady()
 */
export function initAudioLoopback(): void {
  // Build feature flags string
  const existingFeaturesValue =
    app.commandLine.getSwitchValue('enable-features');
  const existingFeatures = existingFeaturesValue
    ? existingFeaturesValue.split(',')
    : [];

  // Remove the switch if it exists
  if (app.commandLine.hasSwitch('enable-features')) {
    app.commandLine.removeSwitch('enable-features');
  }

  // Add our feature flags
  const featureFlags = [
    ...existingFeatures.filter(Boolean),
    FEATURE_FLAGS.pulseaudioLoopbackForScreenShare,
    FEATURE_FLAGS.macLoopbackAudioForScreenShare,
    FEATURE_FLAGS.macScreenCaptureKitOverride,
  ].join(',');

  app.commandLine.appendSwitch('enable-features', featureFlags);

  // Register IPC handler for enabling loopback audio
  ipcMain.handle(IPC_EVENTS.enableLoopbackAudio, () => {
    session.defaultSession.setDisplayMediaRequestHandler((_, callback) => {
      void (async () => {
        let sources;
        try {
          sources = await desktopCapturer.getSources({ types: ['screen'] });
        } catch {
          throw new Error(
            'Failed to get sources for system audio loopback capture.'
          );
        }

        const source = sources[0];
        if (!source) {
          throw new Error(
            'No sources found for system audio loopback capture.'
          );
        }

        callback({
          video: source,
          audio: LOOPBACK_AUDIO_TYPES.loopback,
        });
      })();
    });
    loopbackEnabled = true;
  });

  // Register IPC handler for disabling loopback audio
  ipcMain.handle(IPC_EVENTS.disableLoopbackAudio, () => {
    cleanup();
  });

  // Register cleanup on app quit events
  app.on('before-quit', () => {
    cleanup();
  });

  app.on('will-quit', () => {
    cleanup();
  });

  // Also clean up if all windows are closed (non-macOS behavior)
  app.on('window-all-closed', () => {
    cleanup();
  });
}
