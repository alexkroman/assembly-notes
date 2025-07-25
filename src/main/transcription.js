const { AssemblyAI } = require('assemblyai');
const { getSettings } = require('./settings.js');
const { postToSlack } = require('./slack.js');
const log = require('./logger.js');

let microphoneTranscriber = null;
let systemAudioTranscriber = null;
let aai = null;

let microphoneTranscript = '';
let systemAudioTranscript = '';

// Keep-alive configuration (will be updated from settings)
const KEEP_ALIVE_CONFIG = {
  intervalMs: 30000, // Send keep-alive every 30 seconds
  enabled: true,
};

let keepAliveInterval = null;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Connection state tracking
const connectionState = {
  microphone: {
    isConnecting: false,
    isConnected: false,
    retryCount: 0,
    retryTimeout: null,
  },
  system: {
    isConnecting: false,
    isConnected: false,
    retryCount: 0,
    retryTimeout: null,
  },
};

let isRecordingActive = false;
let mainWindowRef = null;

const DEFAULT_SUMMARY_PROMPT =
  'Summarize the key decisions and action items from the following transcript:';

function calculateRetryDelay(retryCount) {
  const delay = Math.min(
    RETRY_CONFIG.initialDelay *
      Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
    RETRY_CONFIG.maxDelay
  );
  return delay;
}

function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  keepAliveInterval = setInterval(() => {
    // Send a small buffer of silence (16000 Hz * 0.1 seconds = 1600 samples)
    const silenceBuffer = Buffer.alloc(1600 * 2); // 2 bytes per sample for 16-bit

    if (microphoneTranscriber && connectionState.microphone.isConnected) {
      try {
        microphoneTranscriber.sendAudio(silenceBuffer);
        log.debug('Sent keep-alive silence to microphone transcriber');
      } catch (error) {
        log.error('Error sending keep-alive audio to microphone:', error);
      }
    }

    if (systemAudioTranscriber && connectionState.system.isConnected) {
      try {
        systemAudioTranscriber.sendAudio(silenceBuffer);
        log.debug('Sent keep-alive silence to system audio transcriber');
      } catch (error) {
        log.error('Error sending keep-alive audio to system:', error);
      }
    }
  }, KEEP_ALIVE_CONFIG.intervalMs);

  log.info(
    `Keep-alive started for both transcribers (${KEEP_ALIVE_CONFIG.intervalMs}ms interval)`
  );
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    log.info('Keep-alive stopped');
  }
}

async function createTranscriberWithRetry(streamType) {
  const state = connectionState[streamType];

  if (!isRecordingActive || state.isConnecting || state.isConnected) {
    return;
  }

  state.isConnecting = true;

  try {
    log.info(
      `Creating ${streamType} transcriber (attempt ${state.retryCount + 1})...`
    );

    const transcriber = aai.realtime.transcriber({
      sampleRate: 16000,
    });

    setupTranscriberHandlers(transcriber, streamType);

    await transcriber.connect();

    if (streamType === 'microphone') {
      microphoneTranscriber = transcriber;
    } else {
      systemAudioTranscriber = transcriber;
    }

    state.retryCount = 0;
    state.isConnecting = false;
    state.isConnected = true;

    log.info(`${streamType} transcriber connected successfully`);

    // Start keep-alive when both transcribers are connected
    if (
      KEEP_ALIVE_CONFIG.enabled &&
      connectionState.microphone.isConnected &&
      connectionState.system.isConnected
    ) {
      startKeepAlive();
    }
  } catch (error) {
    log.error(`Failed to connect ${streamType} transcriber:`, error);
    state.isConnecting = false;
    state.isConnected = false;

    if (state.retryCount < RETRY_CONFIG.maxRetries && isRecordingActive) {
      state.retryCount++;
      const delay = calculateRetryDelay(state.retryCount - 1);

      log.info(`Retrying ${streamType} connection in ${delay}ms...`);
      mainWindowRef.webContents.send('connection-status', {
        stream: streamType,
        connected: false,
        retrying: true,
        nextRetryIn: delay,
      });

      state.retryTimeout = setTimeout(() => {
        createTranscriberWithRetry(streamType);
      }, delay);
    } else {
      log.error(`Max retries reached for ${streamType} transcriber`);
      mainWindowRef.webContents.send(
        'error',
        `Failed to connect ${streamType} after ${RETRY_CONFIG.maxRetries} attempts`
      );
    }
  }
}

function setupTranscriberHandlers(transcriber, streamType) {
  const state = connectionState[streamType];

  transcriber.on('open', () => {
    state.isConnected = true;
    mainWindowRef.webContents.send('connection-status', {
      stream: streamType,
      connected: true,
    });
  });

  transcriber.on('error', async (error) => {
    log.error(`${streamType} transcription error:`, error);

    // Don't send error to UI if we're going to retry
    if (state.retryCount < RETRY_CONFIG.maxRetries && isRecordingActive) {
      log.info(`Will attempt to reconnect ${streamType}...`);
    } else {
      mainWindowRef.webContents.send(
        'error',
        `${streamType} error: ${error.message}`
      );
    }
  });

  transcriber.on('close', async () => {
    log.warn(`${streamType} transcriber connection closed`);
    state.isConnected = false;
    state.isConnecting = false;

    if (streamType === 'microphone') {
      microphoneTranscriber = null;
    } else {
      systemAudioTranscriber = null;
    }

    mainWindowRef.webContents.send('connection-status', {
      stream: streamType,
      connected: false,
    });

    // Attempt to reconnect if recording is still active
    if (isRecordingActive && state.retryCount < RETRY_CONFIG.maxRetries) {
      const delay = calculateRetryDelay(state.retryCount);
      log.info(`Scheduling ${streamType} reconnection in ${delay}ms...`);

      state.retryTimeout = setTimeout(() => {
        createTranscriberWithRetry(streamType);
      }, delay);
    }
  });

  transcriber.on('transcript', (transcript) => {
    if (!transcript.text) return;

    if (transcript.message_type === 'FinalTranscript') {
      const line = `${transcript.text}\n`;
      if (streamType === 'microphone') {
        microphoneTranscript += line;
      } else {
        systemAudioTranscript += line;
      }
      mainWindowRef.webContents.send('transcript', {
        text: transcript.text,
        partial: false,
      });
    } else {
      mainWindowRef.webContents.send('transcript', {
        text: transcript.text,
        partial: true,
      });
    }
  });
}

async function processRecordingComplete() {
  const fullTranscript = microphoneTranscript + systemAudioTranscript;
  if (!fullTranscript.trim()) {
    return false;
  }

  const now = new Date();
  const title = `Meeting Summary - ${now.toLocaleString()}`;

  try {
    const settings = getSettings();
    const summaryPrompt = settings.summaryPrompt || DEFAULT_SUMMARY_PROMPT;

    const lemur = aai.lemur;
    const result = await lemur.task({
      prompt: summaryPrompt,
      input_text: fullTranscript,
      final_model: 'anthropic/claude-sonnet-4-20250514',
    });
    const summary = result.response;

    await postToSlack(summary, title);
    return true;
  } catch (err) {
    log.error(`Error during summarization: ${err.message}`);
    return false;
  }
}

async function startTranscription(mainWindow) {
  const settings = getSettings();
  const assemblyAiApiKey = settings.assemblyaiKey;

  if (!assemblyAiApiKey) {
    mainWindow.webContents.send(
      'error',
      'AssemblyAI API Key is not set. Please add it in settings.'
    );
    return false;
  }

  try {
    // Update keep-alive config from settings
    KEEP_ALIVE_CONFIG.enabled = settings.keepAliveEnabled ?? true;
    KEEP_ALIVE_CONFIG.intervalMs =
      (settings.keepAliveIntervalSeconds ?? 30) * 1000;

    aai = new AssemblyAI({ apiKey: assemblyAiApiKey });
    mainWindowRef = mainWindow;
    isRecordingActive = true;

    // Reset connection state
    Object.keys(connectionState).forEach((stream) => {
      connectionState[stream].isConnecting = false;
      connectionState[stream].isConnected = false;
      connectionState[stream].retryCount = 0;
      if (connectionState[stream].retryTimeout) {
        clearTimeout(connectionState[stream].retryTimeout);
        connectionState[stream].retryTimeout = null;
      }
    });

    microphoneTranscript = '';
    systemAudioTranscript = '';

    // Start connections with retry logic
    await Promise.all([
      createTranscriberWithRetry('microphone'),
      createTranscriberWithRetry('system'),
    ]);

    mainWindow.webContents.send('start-audio-capture');

    return true;
  } catch (error) {
    log.error('Failed to start transcription:', error);
    mainWindow.webContents.send('error', `Failed to start: ${error.message}`);
    isRecordingActive = false;
    return false;
  }
}

async function stopTranscription(mainWindow) {
  isRecordingActive = false;
  mainWindow.webContents.send('stop-audio-capture');

  // Stop keep-alive
  stopKeepAlive();

  // Clear any pending retry timeouts
  Object.keys(connectionState).forEach((stream) => {
    if (connectionState[stream].retryTimeout) {
      clearTimeout(connectionState[stream].retryTimeout);
      connectionState[stream].retryTimeout = null;
    }
    connectionState[stream].retryCount = 0;
  });

  if (microphoneTranscriber) {
    try {
      await microphoneTranscriber.close();
    } catch (error) {
      log.error('Error closing microphone transcriber:', error);
    }
    microphoneTranscriber = null;
  }

  if (systemAudioTranscriber) {
    try {
      await systemAudioTranscriber.close();
    } catch (error) {
      log.error('Error closing system audio transcriber:', error);
    }
    systemAudioTranscriber = null;
  }

  log.info('Recording stopped.');
  mainWindow.webContents.send('recording-stopped');

  processRecordingComplete().catch((error) => {
    log.error('Post-processing failed:', error);
  });

  return true;
}

function sendMicrophoneAudio(audioData) {
  if (microphoneTranscriber) {
    try {
      const buffer = Buffer.from(audioData);
      microphoneTranscriber.sendAudio(buffer);
    } catch (error) {
      log.error('Error sending microphone audio:', error);
    }
  }
}

function sendSystemAudio(audioData) {
  if (systemAudioTranscriber) {
    try {
      const buffer = Buffer.from(audioData);
      systemAudioTranscriber.sendAudio(buffer);
    } catch (error) {
      log.error('Error sending system audio:', error);
    }
  }
}

function resetAai() {
  aai = null;
}

module.exports = {
  startTranscription,
  stopTranscription,
  sendMicrophoneAudio,
  sendSystemAudio,
  resetAai,
};
