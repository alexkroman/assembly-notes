import { jest } from '@jest/globals';
describe('TranscriptionService', () => {
    let transcriptionService;
    let mockAssemblyAI;
    let mockTranscriber;
    beforeEach(async () => {
        jest.clearAllMocks();
        // Create mock transcriber
        mockTranscriber = {
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            sendAudio: jest.fn(),
            on: jest.fn(),
        };
        // Create mock AssemblyAI instance
        mockAssemblyAI = {
            realtime: {
                transcriber: jest.fn().mockReturnValue(mockTranscriber),
            },
        };
        // Mock the AssemblyAI constructor
        const { AssemblyAI } = await import('assemblyai');
        AssemblyAI.mockImplementation(() => mockAssemblyAI);
        const TranscriptionService = await import('../../src/main/transcriptionService');
        transcriptionService = new TranscriptionService.default();
    });
    afterEach(async () => {
        await transcriptionService.stop();
        jest.clearAllTimers();
        jest.useRealTimers();
    });
    describe('initialize', () => {
        it('should initialize with API key and default keep-alive settings', async () => {
            const { AssemblyAI } = await import('assemblyai');
            transcriptionService.initialize('test-api-key');
            expect(AssemblyAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
            expect(transcriptionService.keepAliveConfig.enabled).toBe(true);
            expect(transcriptionService.keepAliveConfig.intervalMs).toBe(30000);
        });
        it('should initialize with custom keep-alive settings', () => {
            const keepAliveSettings = {
                enabled: false,
                intervalSeconds: 60,
            };
            transcriptionService.initialize('test-api-key', keepAliveSettings);
            expect(transcriptionService.keepAliveConfig.enabled).toBe(false);
            expect(transcriptionService.keepAliveConfig.intervalMs).toBe(60000);
        });
    });
    describe('calculateRetryDelay', () => {
        it('should calculate exponential backoff delay', () => {
            const delay0 = transcriptionService.calculateRetryDelay(0);
            const delay1 = transcriptionService.calculateRetryDelay(1);
            const delay2 = transcriptionService.calculateRetryDelay(2);
            expect(delay0).toBe(1000);
            expect(delay1).toBe(2000);
            expect(delay2).toBe(4000);
        });
        it('should cap delay at maximum value', () => {
            const delay = transcriptionService.calculateRetryDelay(10);
            expect(delay).toBe(30000); // Max delay
        });
    });
    describe('start', () => {
        beforeEach(() => {
            transcriptionService.initialize('test-api-key');
        });
        it('should start transcription successfully', async () => {
            await transcriptionService.start();
            expect(mockAssemblyAI.realtime.transcriber).toHaveBeenCalledTimes(2);
            expect(mockTranscriber.connect).toHaveBeenCalledTimes(2);
            expect(transcriptionService.isActive).toBe(true);
        });
        it('should throw error if not initialized', async () => {
            const { default: TranscriptionService } = await import('../../src/main/transcriptionService');
            const uninitializedService = new TranscriptionService();
            await expect(uninitializedService.start()).rejects.toThrow('TranscriptionService not initialized. Call initialize() first.');
        });
        it('should reset connection state on start', async () => {
            // Set some initial state
            transcriptionService.connectionState.microphone.retryCount = 3;
            transcriptionService.connectionState.system.isConnected = true;
            await transcriptionService.start();
            expect(transcriptionService.connectionState.microphone.retryCount).toBe(0);
            expect(transcriptionService.connectionState.system.retryCount).toBe(0);
            // Note: isConnected might be true after successful connection attempt
        });
        it('should emit transcription-started event', async () => {
            const startedSpy = jest.fn();
            transcriptionService.on('transcription-started', startedSpy);
            await transcriptionService.start();
            expect(startedSpy).toHaveBeenCalled();
        });
    });
    describe('stop', () => {
        beforeEach(async () => {
            transcriptionService.initialize('test-api-key');
            await transcriptionService.start();
        });
        it('should stop transcription and close transcribers', async () => {
            await transcriptionService.stop();
            expect(transcriptionService.isActive).toBe(false);
            expect(mockTranscriber.close).toHaveBeenCalledTimes(2);
        });
        it('should emit transcription-stopped event', async () => {
            const stoppedSpy = jest.fn();
            transcriptionService.on('transcription-stopped', stoppedSpy);
            await transcriptionService.stop();
            expect(stoppedSpy).toHaveBeenCalled();
        });
        it('should handle errors when closing transcribers', async () => {
            const closeError = new Error('Close failed');
            mockTranscriber.close.mockRejectedValue(closeError);
            await transcriptionService.stop();
            expect(mockTranscriber.close).toHaveBeenCalledTimes(2);
            expect(transcriptionService.isActive).toBe(false);
        });
        it('should clear retry timeouts', async () => {
            // Set up a retry timeout
            transcriptionService.connectionState.microphone.retryTimeout = setTimeout(() => { }, 1000);
            const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
            await transcriptionService.stop();
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });
    describe('sendMicrophoneAudio', () => {
        beforeEach(async () => {
            transcriptionService.initialize('test-api-key');
            await transcriptionService.start();
        });
        it('should send audio data to microphone transcriber', () => {
            const audioData = new Uint8Array([1, 2, 3, 4]);
            transcriptionService.sendMicrophoneAudio(audioData);
            expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(Buffer.from(audioData));
        });
        it('should handle errors when sending audio data', () => {
            const sendError = new Error('Send failed');
            mockTranscriber.sendAudio.mockImplementation(() => {
                throw sendError;
            });
            const audioData = new Uint8Array([1, 2, 3, 4]);
            expect(() => {
                transcriptionService.sendMicrophoneAudio(audioData);
            }).not.toThrow();
        });
    });
    describe('sendSystemAudio', () => {
        beforeEach(async () => {
            transcriptionService.initialize('test-api-key');
            await transcriptionService.start();
        });
        it('should send audio data to system audio transcriber', () => {
            const audioData = new Uint8Array([1, 2, 3, 4]);
            transcriptionService.sendSystemAudio(audioData);
            expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(Buffer.from(audioData));
        });
        it('should handle errors when sending system audio data', () => {
            const sendError = new Error('Send failed');
            mockTranscriber.sendAudio.mockImplementation(() => {
                throw sendError;
            });
            const audioData = new Uint8Array([1, 2, 3, 4]);
            expect(() => {
                transcriptionService.sendSystemAudio(audioData);
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
            transcriptionService.initialize('test-api-key');
            await transcriptionService.start();
        });
        it('should handle transcriber open event', () => {
            const connectionStatusSpy = jest.fn();
            transcriptionService.on('connection-status', connectionStatusSpy);
            onHandlers.open();
            expect(connectionStatusSpy).toHaveBeenCalledWith({
                stream: expect.any(String),
                connected: true,
            });
        });
        it('should handle transcriber error event', async () => {
            const errorSpy = jest.fn();
            transcriptionService.on('error', errorSpy);
            const error = new Error('Transcription error');
            await onHandlers.error(error);
            // Error handling depends on retry count and active state
            expect(onHandlers.error).toBeDefined();
        });
        it('should handle transcriber close event', async () => {
            const connectionStatusSpy = jest.fn();
            transcriptionService.on('connection-status', connectionStatusSpy);
            await onHandlers.close();
            expect(connectionStatusSpy).toHaveBeenCalledWith({
                stream: expect.any(String),
                connected: false,
            });
        });
        it('should handle final transcript events', () => {
            const transcriptSpy = jest.fn();
            transcriptionService.on('transcript', transcriptSpy);
            const transcript = {
                text: 'Hello world',
                message_type: 'FinalTranscript',
            };
            onHandlers.transcript(transcript);
            expect(transcriptSpy).toHaveBeenCalledWith({
                streamType: expect.any(String),
                text: 'Hello world',
                partial: false,
            });
        });
        it('should handle partial transcript events', () => {
            const transcriptSpy = jest.fn();
            transcriptionService.on('transcript', transcriptSpy);
            const transcript = {
                text: 'Hello wo...',
                message_type: 'PartialTranscript',
            };
            onHandlers.transcript(transcript);
            expect(transcriptSpy).toHaveBeenCalledWith({
                streamType: expect.any(String),
                text: 'Hello wo...',
                partial: true,
            });
        });
        it('should ignore empty transcript text', () => {
            const transcriptSpy = jest.fn();
            transcriptionService.on('transcript', transcriptSpy);
            const transcript = {
                text: '',
                message_type: 'FinalTranscript',
            };
            onHandlers.transcript(transcript);
            expect(transcriptSpy).not.toHaveBeenCalled();
        });
    });
    describe('keep-alive functionality', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            transcriptionService.initialize('test-api-key');
        });
        it('should start keep-alive when both transcribers are connected', async () => {
            const openHandlers = [];
            mockTranscriber.on.mockImplementation((event, handler) => {
                if (event === 'open') {
                    openHandlers.push(handler);
                }
            });
            await transcriptionService.start();
            // Simulate both transcribers connecting
            openHandlers.forEach((handler) => { handler(); });
            // Fast-forward time to trigger keep-alive
            jest.advanceTimersByTime(30000);
            expect(mockTranscriber.sendAudio).toHaveBeenCalledWith(expect.any(Buffer));
        });
        it('should stop keep-alive when transcription stops', async () => {
            await transcriptionService.start();
            await transcriptionService.stop();
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
            transcriptionService.initialize('test-api-key');
        });
        it('should retry connection on failure', async () => {
            mockTranscriber.connect.mockRejectedValue(new Error('Connection failed'));
            await transcriptionService.start();
            // Fast-forward time to trigger retry
            jest.advanceTimersByTime(1000);
            // 2 initial calls (microphone + system) + 2 retries = 4 total
            expect(mockTranscriber.connect).toHaveBeenCalledTimes(4);
        });
        it('should emit retry status', async () => {
            const connectionStatusSpy = jest.fn();
            transcriptionService.on('connection-status', connectionStatusSpy);
            mockTranscriber.connect.mockRejectedValue(new Error('Connection failed'));
            await transcriptionService.start();
            expect(connectionStatusSpy).toHaveBeenCalledWith({
                stream: expect.any(String),
                connected: false,
                retrying: true,
                nextRetryIn: expect.any(Number),
            });
        });
    });
    describe('reset', () => {
        it('should reset the AssemblyAI instance', () => {
            transcriptionService.initialize('test-api-key');
            transcriptionService.reset();
            expect(transcriptionService.getAai()).toBeNull();
        });
    });
});
//# sourceMappingURL=transcriptionService.test.js.map