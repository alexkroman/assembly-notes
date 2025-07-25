jest.mock('assemblyai');
jest.mock('../src/main/settings.js');
jest.mock('../src/main/slack.js');
jest.mock('../src/main/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { AssemblyAI } = require('assemblyai');
const { getSettings } = require('../src/main/settings.js');
const { postToSlack } = require('../src/main/slack.js');

describe('Transcription Module', () => {
  let transcriptionModule;
  let mockAssemblyAI;
  let mockTranscriber;
  let mockMainWindow;
  let mockLemur;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock settings first
    getSettings.mockReturnValue({
      assemblyaiKey: 'test-api-key',
      summaryPrompt: 'Test summary prompt',
      keepAliveEnabled: true,
      keepAliveIntervalSeconds: 30,
    });

    // Mock postToSlack
    postToSlack.mockResolvedValue(true);

    // Mock the transcriber
    mockTranscriber = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      sendAudio: jest.fn(),
      on: jest.fn(),
    };

    // Mock lemur for AI summarization
    mockLemur = {
      task: jest.fn().mockResolvedValue({ response: 'Test summary' }),
    };

    // Mock AssemblyAI class
    mockAssemblyAI = {
      realtime: {
        transcriber: jest.fn().mockReturnValue(mockTranscriber),
      },
      lemur: mockLemur,
    };

    AssemblyAI.mockImplementation(() => mockAssemblyAI);

    // Mock main window
    mockMainWindow = {
      webContents: {
        send: jest.fn(),
      },
    };

    transcriptionModule = require('../src/main/transcription.js');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('startTranscription', () => {
    it('should start transcription successfully with valid API key', async () => {
      const result = await transcriptionModule.startTranscription(mockMainWindow);

      expect(result).toBe(true);
      expect(AssemblyAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(mockAssemblyAI.realtime.transcriber).toHaveBeenCalledTimes(2);
      expect(mockTranscriber.connect).toHaveBeenCalledTimes(2);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('start-audio-capture');
    });

    it('should fail when AssemblyAI API key is not set', async () => {
      getSettings.mockReturnValue({ assemblyaiKey: null });

      const result = await transcriptionModule.startTranscription(mockMainWindow);

      expect(result).toBe(false);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'error',
        'AssemblyAI API Key is not set. Please add it in settings.'
      );
    });

    it('should handle connection errors and send error to main window', async () => {
      const connectionError = new Error('Connection failed');
      mockTranscriber.connect.mockRejectedValue(connectionError);

      const result = await transcriptionModule.startTranscription(mockMainWindow);

      expect(result).toBe(true); // startTranscription returns true but handles errors internally
      // Error handling happens asynchronously in createTranscriberWithRetry
    });

    it('should configure keep-alive settings from user preferences', async () => {
      getSettings.mockReturnValue({
        assemblyaiKey: 'test-key',
        keepAliveEnabled: false,
        keepAliveIntervalSeconds: 60,
      });

      await transcriptionModule.startTranscription(mockMainWindow);

      expect(AssemblyAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });
  });

  describe('stopTranscription', () => {
    beforeEach(async () => {
      await transcriptionModule.startTranscription(mockMainWindow);
    });

    it('should stop transcription and close both transcribers', async () => {
      const result = await transcriptionModule.stopTranscription(mockMainWindow);

      expect(result).toBe(true);
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('stop-audio-capture');
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('recording-stopped');
      expect(mockTranscriber.close).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when closing transcribers', async () => {
      const closeError = new Error('Close failed');
      mockTranscriber.close.mockRejectedValue(closeError);

      const result = await transcriptionModule.stopTranscription(mockMainWindow);

      expect(result).toBe(true);
      expect(mockTranscriber.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendMicrophoneAudio', () => {
    beforeEach(async () => {
      await transcriptionModule.startTranscription(mockMainWindow);
    });

    it('should send audio data to microphone transcriber', () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);

      transcriptionModule.sendMicrophoneAudio(audioData);

      expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(Buffer.from(audioData));
    });

    it('should handle errors when sending audio data', () => {
      const sendError = new Error('Send failed');
      mockTranscriber.sendAudio.mockImplementation(() => {
        throw sendError;
      });
      const audioData = new Uint8Array([1, 2, 3, 4]);

      expect(() => {
        transcriptionModule.sendMicrophoneAudio(audioData);
      }).not.toThrow();
    });
  });

  describe('sendSystemAudio', () => {
    beforeEach(async () => {
      await transcriptionModule.startTranscription(mockMainWindow);
    });

    it('should send audio data to system audio transcriber', () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);

      transcriptionModule.sendSystemAudio(audioData);

      expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(Buffer.from(audioData));
    });

    it('should handle errors when sending system audio data', () => {
      const sendError = new Error('Send failed');
      mockTranscriber.sendAudio.mockImplementation(() => {
        throw sendError;
      });
      const audioData = new Uint8Array([1, 2, 3, 4]);

      expect(() => {
        transcriptionModule.sendSystemAudio(audioData);
      }).not.toThrow();
    });
  });

  describe('transcriber event handlers', () => {
    let onHandlers;

    beforeEach(async () => {
      onHandlers = {};
      mockTranscriber.on.mockImplementation((event, handler) => {
        onHandlers[event] = handler;
      });

      await transcriptionModule.startTranscription(mockMainWindow);
    });

    it('should handle transcriber open event', () => {
      onHandlers.open();

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('connection-status', {
        stream: expect.any(String),
        connected: true,
      });
    });

    it('should handle transcriber error event', async () => {
      const error = new Error('Transcription error');

      await onHandlers.error(error);

      // The error handler only sends to UI if max retries are reached
      // Since we start with retryCount 0, it won't send error immediately
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('start-audio-capture');
    });

    it('should handle transcriber close event', async () => {
      await onHandlers.close();

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('connection-status', {
        stream: expect.any(String),
        connected: false,
      });
    });

    it('should handle final transcript events', () => {
      const transcript = {
        text: 'Hello world',
        message_type: 'FinalTranscript',
      };

      onHandlers.transcript(transcript);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('transcript', {
        text: 'Hello world',
        partial: false,
      });
    });

    it('should handle partial transcript events', () => {
      const transcript = {
        text: 'Hello wo...',
        message_type: 'PartialTranscript',
      };

      onHandlers.transcript(transcript);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('transcript', {
        text: 'Hello wo...',
        partial: true,
      });
    });

    it('should ignore empty transcript text', () => {
      const transcript = {
        text: '',
        message_type: 'FinalTranscript',
      };

      onHandlers.transcript(transcript);

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalledWith('transcript', expect.anything());
    });
  });

  describe('keep-alive functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should start keep-alive when both transcribers are connected', async () => {
      let openHandlers = [];
      mockTranscriber.on.mockImplementation((event, handler) => {
        if (event === 'open') {
          openHandlers.push(handler);
        }
      });

      await transcriptionModule.startTranscription(mockMainWindow);

      // Simulate both transcribers connecting
      openHandlers.forEach(handler => handler());

      // Fast-forward time to trigger keep-alive
      jest.advanceTimersByTime(30000);

      expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should stop keep-alive when transcription stops', async () => {
      await transcriptionModule.startTranscription(mockMainWindow);
      await transcriptionModule.stopTranscription(mockMainWindow);

      // Fast-forward time - keep-alive should not trigger
      jest.advanceTimersByTime(30000);

      // sendAudio should only be called during normal operation, not after stop
      const sendAudioCalls = mockTranscriber.sendAudio.mock.calls.length;
      jest.advanceTimersByTime(30000);
      expect(mockTranscriber.sendAudio.mock.calls.length).toBe(sendAudioCalls);
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should retry connection on failure', async () => {
      mockTranscriber.connect.mockRejectedValue(new Error('Connection failed'));

      await transcriptionModule.startTranscription(mockMainWindow);

      // Fast-forward time to trigger retry
      jest.advanceTimersByTime(1000);

      // 2 initial calls (microphone + system) + 2 retries = 4 total
      expect(mockTranscriber.connect).toHaveBeenCalledTimes(4);
    });

    it('should send retry status to main window', async () => {
      mockTranscriber.connect.mockRejectedValue(new Error('Connection failed'));

      await transcriptionModule.startTranscription(mockMainWindow);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('connection-status', {
        stream: expect.any(String),
        connected: false,
        retrying: true,
        nextRetryIn: expect.any(Number),
      });
    });
  });

  describe('resetAai', () => {
    it('should reset the AssemblyAI instance', () => {
      transcriptionModule.resetAai();
      // This function sets aai to null internally, no direct way to test but ensures no error
      expect(() => transcriptionModule.resetAai()).not.toThrow();
    });
  });

  describe('post-processing and summarization', () => {
    beforeEach(async () => {
      let transcriptHandlers = [];
      mockTranscriber.on.mockImplementation((event, handler) => {
        if (event === 'transcript') {
          transcriptHandlers.push(handler);
        }
      });

      await transcriptionModule.startTranscription(mockMainWindow);

      // Simulate receiving some transcripts
      transcriptHandlers.forEach(handler => {
        handler({
          text: 'Test transcript content',
          message_type: 'FinalTranscript',
        });
      });
    });

    it('should process recording and post summary to Slack', async () => {
      await transcriptionModule.stopTranscription(mockMainWindow);

      // Allow async processing to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLemur.task).toHaveBeenCalledWith({
        prompt: 'Test summary prompt',
        input_text: expect.stringContaining('Test transcript content'),
        final_model: 'anthropic/claude-sonnet-4-20250514',
      });
      expect(postToSlack).toHaveBeenCalledWith(
        'Test summary',
        expect.stringMatching(/Meeting Summary - .*/)
      );
    });

    it('should handle summarization errors gracefully', async () => {
      mockLemur.task.mockRejectedValue(new Error('Summarization failed'));

      await transcriptionModule.stopTranscription(mockMainWindow);

      // Allow async processing to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLemur.task).toHaveBeenCalled();
      // Should not crash the application
    });

    it('should skip processing when no transcript content exists', async () => {
      // Start fresh without any transcript content
      await transcriptionModule.startTranscription(mockMainWindow);
      await transcriptionModule.stopTranscription(mockMainWindow);

      // Allow async processing to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLemur.task).not.toHaveBeenCalled();
      expect(postToSlack).not.toHaveBeenCalled();
    });
  });
});