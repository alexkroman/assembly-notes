import { acquireStreams, releaseStreams, monitorStream } from './media.js';
import {
  renderTranscript,
  updateAudioStatus,
  updateConnectionStatus,
  setButtonState,
  clearTranscripts,
  getElements,
} from './ui.js';
import {
  startAudioProcessing,
  stopAudioProcessing,
  setRecordingState,
} from './audio-processing.js';
import { showSettingsModal } from './settings-modal.js';
import { initAutoUpdaterUI } from './auto-updater-ui.js';

let isRecording: boolean = false;
let streams: any = null;

window.electronAPI.onTranscript((data: any) => {
  renderTranscript(data);
});

window.electronAPI.onConnectionStatus((data: any) => {
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

window.electronAPI.onError((message: string) => {
  window.logger.error('Error:', message);
  alert('Error: ' + message);
  stopRecording();
});

async function start(): Promise<void> {
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
  } catch (error: any) {
    window.logger.error('Error starting transcription:', error);
    alert('Error starting transcription: ' + error.message);
    setButtonState('idle');
    isRecording = false;
    stopRecording();
  }
}

async function stopRecording(): Promise<void> {
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

async function toggle(): Promise<void> {
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
