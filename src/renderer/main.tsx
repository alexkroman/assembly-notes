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
import './assets/styles.css';

// Initialize auto-updater UI
initAutoUpdaterUI();

// Create Redux store for renderer
const store = createRendererStore();

// Set up global audio capture handlers
window.electronAPI.onStartAudioCapture(() => {
  window.logger.info('Renderer: Received start-audio-capture event');
  void (async () => {
    try {
      const { microphoneStream, systemAudioStream } = await acquireStreams();
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
