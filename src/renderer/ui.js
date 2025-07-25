const transcriptionResults = document.getElementById('transcriptionResults');
const audioStatus = document.getElementById('audioStatus');
const toggleBtn = document.getElementById('toggleBtn');
const settingsBtn = document.getElementById('settingsBtn');

let autoScrollEnabled = true;
let micConnected = false;
let systemConnected = false;

function isAtBottom() {
  const threshold = 50; // pixels from bottom
  return (
    transcriptionResults.scrollHeight -
      transcriptionResults.scrollTop -
      transcriptionResults.clientHeight <
    threshold
  );
}

transcriptionResults.addEventListener('scroll', () => {
  autoScrollEnabled = isAtBottom();
});

export function renderTranscript(data) {
  const { text, partial } = data;

  if (!text) return;

  const timestamp = new Date()
    .toLocaleTimeString()
    .replace(/\s?(AM|PM)/i, (match, ampm) => ampm.toLowerCase().charAt(0));
  const prefix = partial ? '>> ' : '';

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
    if (prefix) {
      transcriptElement.textContent = prefix + text;
    } else {
      const timestampSpan = document.createElement('span');
      timestampSpan.className = 'timestamp';
      timestampSpan.textContent = `[${timestamp}] `;

      transcriptElement.appendChild(timestampSpan);
      transcriptElement.appendChild(document.createTextNode(text));
    }
    transcriptionResults.appendChild(transcriptElement);
  }

  if (autoScrollEnabled) {
    transcriptionResults.scrollTop = transcriptionResults.scrollHeight;
  }
}

export function updateAudioStatus(status) {
  if (status) {
    audioStatus.textContent = status.text;
    audioStatus.className = `status ${status.className}`;
  } else {
    if (micConnected && systemConnected) {
      audioStatus.textContent = 'Audio: Connected';
      audioStatus.className = 'status connected';
    } else {
      audioStatus.textContent = 'Audio: Disconnected';
      audioStatus.className = 'status disconnected';
    }
  }
}

export function updateConnectionStatus(stream, connected) {
  if (stream === 'microphone') {
    micConnected = connected;
  } else if (stream === 'system') {
    systemConnected = connected;
  }
  updateAudioStatus();
}

export function setButtonState(state) {
  switch (state) {
    case 'starting':
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Starting...';
      break;
    case 'recording':
      toggleBtn.disabled = false;
      toggleBtn.textContent = 'Stop Recording';
      toggleBtn.classList.remove('start');
      toggleBtn.classList.add('recording');
      break;
    case 'stopping':
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Stopping...';
      break;
    case 'idle':
      toggleBtn.disabled = false;
      toggleBtn.textContent = 'Start Recording';
      toggleBtn.classList.remove('recording');
      toggleBtn.classList.add('start');
      break;
  }
}

export function clearTranscripts() {
  transcriptionResults.innerHTML = '';
}

export function getElements() {
  return {
    toggleBtn,
    settingsBtn,
    transcriptionResults,
    audioStatus,
  };
}
