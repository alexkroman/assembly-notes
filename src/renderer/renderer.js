
const { processEchoCancellation, cleanupEchoCancellation } =
  window.EchoCancellation;
const { startAudioProcessing, stopAudioProcessing, setRecordingState } =
  window.AudioProcessing;
const { showSettingsModal } = window.SettingsModal;
const { initAutoUpdaterUI } = window.AutoUpdaterUI;

let microphoneStream = null;
let systemAudioStream = null;
let isRecording = false;
let micConnected = false;
let systemConnected = false;

const transcriptionResults = document.getElementById('transcriptionResults');
const audioStatus = document.getElementById('audioStatus');
const toggleBtn = document.getElementById('toggleBtn');
const settingsBtn = document.getElementById('settingsBtn');

function updateAudioStatus() {
  if (micConnected && systemConnected) {
    audioStatus.textContent = 'Audio: Connected';
    audioStatus.className = 'status connected';
  } else {
    audioStatus.textContent = 'Audio: Disconnected';
    audioStatus.className = 'status disconnected';
  }
}

window.electronAPI.onTranscript((data) => {
  const { text, partial } = data;

  if (!text) return;

  const timestamp = new Date().toLocaleTimeString();
  const prefix = partial ? '>> ' : `[${timestamp}] `;

  if (partial) {
    let partialElement = transcriptionResults.querySelector('.partial');
    if (!partialElement) {
      partialElement = document.createElement('div');
      partialElement.className = 'partial';
      transcriptionResults.appendChild(partialElement);
    }
    partialElement.textContent = prefix + text;
  } else {
    const partialElement = transcriptionResults.querySelector('.partial');
    if (partialElement) {
      partialElement.remove();
    }

    const transcriptElement = document.createElement('div');
    transcriptElement.textContent = prefix + text;
    transcriptionResults.appendChild(transcriptElement);
  }
});

window.electronAPI.onConnectionStatus((data) => {
  const { stream, connected } = data;
  if (stream === 'microphone') {
    micConnected = connected;
  } else if (stream === 'system') {
    systemConnected = connected;
  }
  updateAudioStatus();

  // If any stream becomes disconnected during recording, stop automatically
  if (!connected && isRecording) {
    window.logger.warn(`${stream} connection lost during recording`);
    alert(
      `${stream.charAt(0).toUpperCase() + stream.slice(1)} connection lost. Stopping recording.`
    );
    stopRecording();
  }
});

window.electronAPI.onError((message) => {
  window.logger.error('Error:', message);
  alert('Error: ' + message);
  stopRecording();
});

async function start() {
  try {
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Starting...';

    transcriptionResults.innerHTML = '';

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    };

    microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Monitor microphone stream for disconnection
    microphoneStream.getTracks().forEach((track) => {
      track.onended = () => {
        window.logger.warn('Microphone track ended unexpectedly');
        if (isRecording) {
          alert('Microphone disconnected. Stopping recording.');
          stopRecording();
        }
      };
    });

    await window.electronAPI.enableLoopbackAudio();

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    await window.electronAPI.disableLoopbackAudio();

    const videoTracks = displayStream
      .getTracks()
      .filter((t) => t.kind === 'video');
    videoTracks.forEach((t) => {
      t.stop();
      displayStream.removeTrack(t);
    });

    systemAudioStream = displayStream;

    // Monitor system audio stream for disconnection
    systemAudioStream.getTracks().forEach((track) => {
      track.onended = () => {
        window.logger.warn('System audio track ended unexpectedly');
        if (isRecording) {
          alert('System audio disconnected. Stopping recording.');
          stopRecording();
        }
      };
    });

    const processedStream = processEchoCancellation(
      microphoneStream,
      systemAudioStream
    );

    await startAudioProcessing(processedStream, null);

    const success = await window.electronAPI.startRecording();

    if (!success) {
      throw new Error('Failed to start recording');
    }

    isRecording = true;
    setRecordingState(true);

    toggleBtn.disabled = false;
    toggleBtn.textContent = 'Stop Recording';
    toggleBtn.classList.remove('start');
    toggleBtn.classList.add('recording');
  } catch (error) {
    window.logger.error('Error starting transcription:', error);
    alert('Error starting transcription: ' + error.message);
    toggleBtn.disabled = false;
    toggleBtn.textContent = 'Start Recording';
    toggleBtn.classList.remove('recording');
    toggleBtn.classList.add('start');
    isRecording = false;
    stopRecording();
  }
}

async function stopRecording() {
  toggleBtn.disabled = true;
  toggleBtn.textContent = 'Stopping...';
  isRecording = false;

  await window.electronAPI.stopRecording();

  stopAudioProcessing();

  if (microphoneStream) {
    microphoneStream.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
  }

  if (systemAudioStream) {
    systemAudioStream.getTracks().forEach((track) => track.stop());
    systemAudioStream = null;
  }

  cleanupEchoCancellation();

  micConnected = false;
  systemConnected = false;
  updateAudioStatus();

  toggleBtn.disabled = false;
  toggleBtn.textContent = 'Start Recording';
  toggleBtn.classList.remove('recording');
  toggleBtn.classList.add('start');
}

async function toggle() {
  if (isRecording) {
    await stopRecording();
  } else {
    await start();
  }
}

toggleBtn.addEventListener('click', toggle);
settingsBtn.addEventListener('click', showSettingsModal);

toggleBtn.textContent = 'Start Recording';
toggleBtn.classList.add('start');

// Initialize auto-updater UI
initAutoUpdaterUI();
