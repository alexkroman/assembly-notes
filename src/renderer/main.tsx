import * as Sentry from '@sentry/electron/renderer';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import {
  startAudioProcessing,
  stopAudioProcessing,
  setRecordingState,
} from './audio-processing';
import { initAutoUpdaterUI } from './auto-updater-ui';
import { App } from './components/App';
import { acquireStreams, releaseStreams } from './media';
import { createRendererStore, setStatus } from './store';
import './assets/tailwind.css';

// Initialize Sentry only in production
const isProduction = process.env['NODE_ENV'] === 'production';
const sentryDsn =
  'https://fdae435c29626d7c3480f4bd5d2e9c33@o4509792651902976.ingest.us.sentry.io/4509792663764992';

if (isProduction) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
} else {
  // In development, disable Sentry by providing an empty DSN
  Sentry.init({
    dsn: '',
    enabled: false,
  });
}

// Initialize auto-updater UI
initAutoUpdaterUI();

// Create Redux store for renderer
const store = createRendererStore();

// Set user ID in Sentry from settings
const settings = store.getState().settings;
if (settings.userId) {
  window.logger.info(`Setting Sentry user ID in renderer: ${settings.userId}`);
  Sentry.setUser({ id: settings.userId });
}

// Set up global audio capture handlers
window.electronAPI.onStartAudioCapture(() => {
  window.logger.info('Renderer: Received start-audio-capture event');
  void (async () => {
    try {
      // Check if we're in dictation mode from Redux state
      const isDictationMode = store.getState().recording.isDictating;
      const { microphoneStream, systemAudioStream } =
        await acquireStreams(isDictationMode);
      await startAudioProcessing(microphoneStream, systemAudioStream);
      setRecordingState(true);

      // Update status in the store
      store.dispatch(setStatus('Recording...'));
    } catch (error) {
      window.logger.error('Error starting audio capture:', error);
      store.dispatch(setStatus('Error starting audio capture'));
    }
  })();
});

window.electronAPI.onStopAudioCapture(() => {
  try {
    setRecordingState(false);
    stopAudioProcessing();
    releaseStreams();

    // Update status in the store
    store.dispatch(setStatus('Recording stopped'));
  } catch (error) {
    window.logger.error('Error stopping audio capture:', error);
  }
});

// Set up reset handler for complete cleanup
window.electronAPI.onResetAudioProcessing(() => {
  try {
    window.logger.info(
      'Resetting audio processing due to main process request'
    );
    setRecordingState(false);
    stopAudioProcessing();
    releaseStreams();
  } catch (error) {
    window.logger.error('Error resetting audio processing:', error);
  }
});

// Create and render the React app
try {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }

  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
} catch (error) {
  window.logger.error('Error initializing React app:', error);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: ${String(error)}</div>`;
}
