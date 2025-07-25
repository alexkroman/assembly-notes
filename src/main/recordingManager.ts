import { BrowserWindow } from 'electron';
import { getSettings } from './settings.js';
import TranscriptionService from './transcriptionService.js';
import log from './logger.js';

let transcriptionService: TranscriptionService | null = null;
let mainWindowRef: BrowserWindow | null = null;

let microphoneTranscript = '';
let systemAudioTranscript = '';

const DEFAULT_SUMMARY_PROMPT =
  'Summarize the key decisions and action items from the following transcript:';

function initializeTranscriptionService(): TranscriptionService {
  if (!transcriptionService) {
    transcriptionService = new TranscriptionService();
    setupTranscriptionServiceEvents();
  }
  return transcriptionService;
}

function setupTranscriptionServiceEvents(): void {
  transcriptionService!.on('connection-status', (status: any) => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send('connection-status', status);
    }
  });

  transcriptionService!.on('error', (error: string) => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send('error', error);
    }
  });

  transcriptionService!.on('transcript', (data: any) => {
    if (!data.text) return;

    if (!data.partial) {
      const line = `${data.text}\n`;
      if (data.streamType === 'microphone') {
        microphoneTranscript += line;
      } else {
        systemAudioTranscript += line;
      }
    }

    if (mainWindowRef) {
      mainWindowRef.webContents.send('transcript', {
        text: data.text,
        partial: data.partial,
      });
    }
  });

  transcriptionService!.on('transcription-started', () => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send('start-audio-capture');
    }
  });

  transcriptionService!.on('transcription-stopped', () => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send('recording-stopped');
    }
  });
}

async function processRecordingComplete(): Promise<boolean> {
  const fullTranscript = microphoneTranscript + systemAudioTranscript;
  if (!fullTranscript.trim()) {
    return false;
  }


  try {
    const settings = getSettings();
    const summaryPrompt = settings.summaryPrompt || DEFAULT_SUMMARY_PROMPT;

    const aai = transcriptionService!.getAai();
    if (!aai) {
      throw new Error('AssemblyAI client not available');
    }

    const lemur = aai.lemur;
    await lemur.task({
      prompt: summaryPrompt,
      input_text: fullTranscript,
      final_model: 'anthropic/claude-sonnet-4-20250514',
    });
    // Summary generated successfully
    return true;
  } catch (err: any) {
    log.error(`Error during summarization: ${err.message}`);
    return false;
  }
}

async function startTranscription(mainWindow: BrowserWindow): Promise<boolean> {
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
    const service = initializeTranscriptionService();

    // Initialize with settings
    const keepAliveSettings = {
      enabled: settings.keepAliveEnabled ?? true,
      intervalSeconds: settings.keepAliveIntervalSeconds ?? 30,
    };

    service.initialize(assemblyAiApiKey, keepAliveSettings);

    mainWindowRef = mainWindow;

    // Reset transcripts
    microphoneTranscript = '';
    systemAudioTranscript = '';

    await service.start();

    return true;
  } catch (error) {
    log.error('Failed to start transcription:', error);
    mainWindow.webContents.send('error', `Failed to start: ${error.message}`);
    return false;
  }
}

async function stopTranscription(mainWindow: BrowserWindow): Promise<boolean> {
  mainWindow.webContents.send('stop-audio-capture');

  if (transcriptionService) {
    await transcriptionService.stop();
  }

  log.info('Recording stopped.');

  // Process recording completion asynchronously
  processRecordingComplete().catch((error) => {
    log.error('Post-processing failed:', error);
  });

  return true;
}

function sendMicrophoneAudio(audioData: ArrayBuffer): void {
  if (transcriptionService) {
    transcriptionService.sendMicrophoneAudio(audioData);
  }
}

function sendSystemAudio(audioData: ArrayBuffer): void {
  if (transcriptionService) {
    transcriptionService.sendSystemAudio(audioData);
  }
}

function resetAai(): void {
  if (transcriptionService) {
    transcriptionService.reset();
  }
}

export {
  startTranscription,
  stopTranscription,
  sendMicrophoneAudio,
  sendSystemAudio,
  resetAai,
};
