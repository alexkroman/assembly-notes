import { jest } from '@jest/globals';
describe('recordingManager', () => {
    let recordingManager;
    let mockWindow;
    beforeEach(async () => {
        jest.clearAllMocks();
        // Mock BrowserWindow
        mockWindow = {
            webContents: {
                send: jest.fn(),
            },
        };
        // Import the module under test
        recordingManager = await import('../../src/main/recordingManager.ts');
    });
    describe('module exports', () => {
        it('should export startTranscription function', () => {
            expect(recordingManager.startTranscription).toBeDefined();
            expect(typeof recordingManager.startTranscription).toBe('function');
        });
        it('should export stopTranscription function', () => {
            expect(recordingManager.stopTranscription).toBeDefined();
            expect(typeof recordingManager.stopTranscription).toBe('function');
        });
        it('should export sendMicrophoneAudio function', () => {
            expect(recordingManager.sendMicrophoneAudio).toBeDefined();
            expect(typeof recordingManager.sendMicrophoneAudio).toBe('function');
        });
        it('should export sendSystemAudio function', () => {
            expect(recordingManager.sendSystemAudio).toBeDefined();
            expect(typeof recordingManager.sendSystemAudio).toBe('function');
        });
        it('should export resetAai function', () => {
            expect(recordingManager.resetAai).toBeDefined();
            expect(typeof recordingManager.resetAai).toBe('function');
        });
    });
    describe('startTranscription', () => {
        it('should return false when API key is missing', async () => {
            // The mock settings return an empty assemblyaiKey by default
            const result = await recordingManager.startTranscription(mockWindow);
            expect(result).toBe(false);
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('error', 'AssemblyAI API Key is not set. Please add it in settings.');
        });
    });
    describe('stopTranscription', () => {
        it('should return true and send stop-audio-capture message', async () => {
            const result = await recordingManager.stopTranscription(mockWindow);
            expect(result).toBe(true);
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('stop-audio-capture');
        });
    });
    describe('audio functions', () => {
        it('should handle sendMicrophoneAudio without throwing', () => {
            const audioData = new ArrayBuffer(1024);
            expect(() => {
                recordingManager.sendMicrophoneAudio(audioData);
            }).not.toThrow();
        });
        it('should handle sendSystemAudio without throwing', () => {
            const audioData = new ArrayBuffer(1024);
            expect(() => {
                recordingManager.sendSystemAudio(audioData);
            }).not.toThrow();
        });
    });
    describe('resetAai', () => {
        it('should handle resetAai without throwing', () => {
            expect(() => {
                recordingManager.resetAai();
            }).not.toThrow();
        });
    });
});
//# sourceMappingURL=recordingManager.test.js.map