const { AssemblyAI } = require('assemblyai');
const { EventEmitter } = require('events');
const log = require('./logger.js');

class TranscriptionService extends EventEmitter {
  constructor() {
    super();
    this.microphoneTranscriber = null;
    this.systemAudioTranscriber = null;
    this.aai = null;
    this.keepAliveInterval = null;
    this.isActive = false;

    // Keep-alive configuration
    this.keepAliveConfig = {
      intervalMs: 30000,
      enabled: true,
    };

    // Retry configuration
    this.retryConfig = {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };

    // Connection state tracking
    this.connectionState = {
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
  }

  initialize(apiKey, keepAliveSettings = {}) {
    this.aai = new AssemblyAI({ apiKey });

    // Update keep-alive config from settings
    this.keepAliveConfig.enabled = keepAliveSettings.enabled ?? true;
    this.keepAliveConfig.intervalMs =
      (keepAliveSettings.intervalSeconds ?? 30) * 1000;
  }

  calculateRetryDelay(retryCount) {
    const delay = Math.min(
      this.retryConfig.initialDelay *
        Math.pow(this.retryConfig.backoffMultiplier, retryCount),
      this.retryConfig.maxDelay
    );
    return delay;
  }

  startKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      const silenceBuffer = Buffer.alloc(1600 * 2);

      if (
        this.microphoneTranscriber &&
        this.connectionState.microphone.isConnected
      ) {
        try {
          this.microphoneTranscriber.sendAudio(silenceBuffer);
          log.debug('Sent keep-alive silence to microphone transcriber');
        } catch (error) {
          log.error('Error sending keep-alive audio to microphone:', error);
        }
      }

      if (
        this.systemAudioTranscriber &&
        this.connectionState.system.isConnected
      ) {
        try {
          this.systemAudioTranscriber.sendAudio(silenceBuffer);
          log.debug('Sent keep-alive silence to system audio transcriber');
        } catch (error) {
          log.error('Error sending keep-alive audio to system:', error);
        }
      }
    }, this.keepAliveConfig.intervalMs);

    log.info(
      `Keep-alive started for both transcribers (${this.keepAliveConfig.intervalMs}ms interval)`
    );
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      log.info('Keep-alive stopped');
    }
  }

  async createTranscriberWithRetry(streamType) {
    const state = this.connectionState[streamType];

    if (!this.isActive || state.isConnecting || state.isConnected) {
      return;
    }

    state.isConnecting = true;

    try {
      log.info(
        `Creating ${streamType} transcriber (attempt ${state.retryCount + 1})...`
      );

      const transcriber = this.aai.realtime.transcriber({
        sampleRate: 16000,
      });

      this.setupTranscriberHandlers(transcriber, streamType);
      await transcriber.connect();

      if (streamType === 'microphone') {
        this.microphoneTranscriber = transcriber;
      } else {
        this.systemAudioTranscriber = transcriber;
      }

      state.retryCount = 0;
      state.isConnecting = false;
      state.isConnected = true;

      log.info(`${streamType} transcriber connected successfully`);

      // Start keep-alive when both transcribers are connected
      if (
        this.keepAliveConfig.enabled &&
        this.connectionState.microphone.isConnected &&
        this.connectionState.system.isConnected
      ) {
        this.startKeepAlive();
      }

      this.emit('connection-status', {
        stream: streamType,
        connected: true,
      });
    } catch (error) {
      log.error(`Failed to connect ${streamType} transcriber:`, error);
      state.isConnecting = false;
      state.isConnected = false;

      if (state.retryCount < this.retryConfig.maxRetries && this.isActive) {
        state.retryCount++;
        const delay = this.calculateRetryDelay(state.retryCount - 1);

        log.info(`Retrying ${streamType} connection in ${delay}ms...`);
        this.emit('connection-status', {
          stream: streamType,
          connected: false,
          retrying: true,
          nextRetryIn: delay,
        });

        state.retryTimeout = setTimeout(() => {
          this.createTranscriberWithRetry(streamType);
        }, delay);
      } else {
        log.error(`Max retries reached for ${streamType} transcriber`);
        this.emit(
          'error',
          `Failed to connect ${streamType} after ${this.retryConfig.maxRetries} attempts`
        );
      }
    }
  }

  setupTranscriberHandlers(transcriber, streamType) {
    const state = this.connectionState[streamType];

    transcriber.on('open', () => {
      state.isConnected = true;
      this.emit('connection-status', {
        stream: streamType,
        connected: true,
      });
    });

    transcriber.on('error', async (error) => {
      log.error(`${streamType} transcription error:`, error);

      if (state.retryCount < this.retryConfig.maxRetries && this.isActive) {
        log.info(`Will attempt to reconnect ${streamType}...`);
      } else {
        this.emit('error', `${streamType} error: ${error.message}`);
      }
    });

    transcriber.on('close', async () => {
      log.warn(`${streamType} transcriber connection closed`);
      state.isConnected = false;
      state.isConnecting = false;

      if (streamType === 'microphone') {
        this.microphoneTranscriber = null;
      } else {
        this.systemAudioTranscriber = null;
      }

      this.emit('connection-status', {
        stream: streamType,
        connected: false,
      });

      if (this.isActive && state.retryCount < this.retryConfig.maxRetries) {
        const delay = this.calculateRetryDelay(state.retryCount);
        log.info(`Scheduling ${streamType} reconnection in ${delay}ms...`);

        state.retryTimeout = setTimeout(() => {
          this.createTranscriberWithRetry(streamType);
        }, delay);
      }
    });

    transcriber.on('transcript', (transcript) => {
      if (!transcript.text) return;

      this.emit('transcript', {
        streamType,
        text: transcript.text,
        partial: transcript.message_type !== 'FinalTranscript',
      });
    });
  }

  async start() {
    if (!this.aai) {
      throw new Error(
        'TranscriptionService not initialized. Call initialize() first.'
      );
    }

    this.isActive = true;

    // Reset connection state
    Object.keys(this.connectionState).forEach((stream) => {
      this.connectionState[stream].isConnecting = false;
      this.connectionState[stream].isConnected = false;
      this.connectionState[stream].retryCount = 0;
      if (this.connectionState[stream].retryTimeout) {
        clearTimeout(this.connectionState[stream].retryTimeout);
        this.connectionState[stream].retryTimeout = null;
      }
    });

    // Start connections with retry logic
    await Promise.all([
      this.createTranscriberWithRetry('microphone'),
      this.createTranscriberWithRetry('system'),
    ]);

    this.emit('transcription-started');
  }

  async stop() {
    this.isActive = false;
    this.stopKeepAlive();

    // Clear any pending retry timeouts
    Object.keys(this.connectionState).forEach((stream) => {
      if (this.connectionState[stream].retryTimeout) {
        clearTimeout(this.connectionState[stream].retryTimeout);
        this.connectionState[stream].retryTimeout = null;
      }
      this.connectionState[stream].retryCount = 0;
    });

    if (this.microphoneTranscriber) {
      try {
        await this.microphoneTranscriber.close();
      } catch (error) {
        log.error('Error closing microphone transcriber:', error);
      }
      this.microphoneTranscriber = null;
    }

    if (this.systemAudioTranscriber) {
      try {
        await this.systemAudioTranscriber.close();
      } catch (error) {
        log.error('Error closing system audio transcriber:', error);
      }
      this.systemAudioTranscriber = null;
    }

    this.emit('transcription-stopped');
  }

  sendMicrophoneAudio(audioData) {
    if (this.microphoneTranscriber) {
      try {
        const buffer = Buffer.from(audioData);
        this.microphoneTranscriber.sendAudio(buffer);
      } catch (error) {
        log.error('Error sending microphone audio:', error);
      }
    }
  }

  sendSystemAudio(audioData) {
    if (this.systemAudioTranscriber) {
      try {
        const buffer = Buffer.from(audioData);
        this.systemAudioTranscriber.sendAudio(buffer);
      } catch (error) {
        log.error('Error sending system audio:', error);
      }
    }
  }

  reset() {
    this.aai = null;
  }

  getAai() {
    return this.aai;
  }
}

module.exports = TranscriptionService;
