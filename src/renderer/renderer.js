import { acquireStreams, releaseStreams, monitorStream } from './media.js';
import {
  renderTranscript,
  updateAudioStatus,
  updateConnectionStatus,
  setButtonState,
  clearTranscripts,
  getElements,
} from './ui.js';

const { startAudioProcessing, stopAudioProcessing, setRecordingState } =
  window.AudioProcessing;
const { showSettingsModal } = window.SettingsModal;
const { initAutoUpdaterUI } = window.AutoUpdaterUI;

let isRecording = false;
let streams = null;

window.electronAPI.onTranscript((data) => {
  renderTranscript(data);
});

window.electronAPI.onConnectionStatus((data) => {
  const { stream, connected, retrying, nextRetryIn } = data;

  if (retrying) {
    updateAudioStatus({
      text: `Audio: Reconnecting ${stream}... (${Math.round(nextRetryIn / 1000)}s)`,
      className: 'reconnecting',
    });
  } else {
    updateConnectionStatus(stream, connected);
  }
});

window.electronAPI.onError((message) => {
  window.logger.error('Error:', message);
  alert('Error: ' + message);
  stopRecording();
});

async function start() {
  try {
    setButtonState('starting');
    clearTranscripts();

    streams = await acquireStreams();

    monitorStream(streams.microphoneStream, 'Microphone', () => {
      if (isRecording) {
        alert('Microphone disconnected. Stopping recording.');
        stopRecording();
      }
    });

    monitorStream(streams.systemAudioStream, 'System audio', () => {
      if (isRecording) {
        alert('System audio disconnected. Stopping recording.');
        stopRecording();
      }
    });

    await startAudioProcessing(streams.processedStream, null);

    const success = await window.electronAPI.startRecording();

    if (!success) {
      throw new Error('Failed to start recording');
    }

    isRecording = true;
    setRecordingState(true);
    setButtonState('recording');
  } catch (error) {
    window.logger.error('Error starting transcription:', error);
    alert('Error starting transcription: ' + error.message);
    setButtonState('idle');
    isRecording = false;
    stopRecording();
  }
}

async function stopRecording() {
  setButtonState('stopping');
  isRecording = false;

  await window.electronAPI.stopRecording();

  stopAudioProcessing();
  releaseStreams();
  streams = null;

  updateConnectionStatus('microphone', false);
  updateConnectionStatus('system', false);

  setButtonState('idle');
}

async function toggle() {
  if (isRecording) {
    await stopRecording();
  } else {
    await start();
  }
}

const { toggleBtn, settingsBtn } = getElements();

toggleBtn.addEventListener('click', toggle);
settingsBtn.addEventListener('click', showSettingsModal);

setButtonState('idle');

initAutoUpdaterUI();
