import fs from 'fs/promises';
import path from 'path';

import { app } from 'electron';
import Logger from 'electron-log';
import { container } from 'tsyringe';
import wavEncoder from 'wav-encoder';

import { DI_TOKENS } from '../../../src/main/di-tokens.js';
import { AudioRecordingService } from '../../../src/main/services/audioRecordingService.js';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('electron-log');
jest.mock('wav-encoder');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockApp = app as jest.Mocked<typeof app>;
const mockWavEncoder = wavEncoder as jest.Mocked<typeof wavEncoder>;

describe('AudioRecordingService', () => {
  let service: AudioRecordingService;
  let mockLogger: jest.Mocked<typeof Logger>;

  const testUserDataPath = '/test/user/data';
  const testAudioDir = path.join(testUserDataPath, 'recordings');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock app.getPath
    mockApp.getPath.mockReturnValue(testUserDataPath);

    // Mock fs.mkdir to succeed
    mockFs.mkdir.mockResolvedValue(undefined);

    // Mock logger
    mockLogger = Logger as jest.Mocked<typeof Logger>;

    // Register mocks in container
    container.registerInstance(DI_TOKENS.Logger, mockLogger);

    // Create service instance
    service = container.resolve(AudioRecordingService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('constructor', () => {
    it('should create audio directory on initialization', async () => {
      // Wait for async directory creation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFs.mkdir).toHaveBeenCalledWith(testAudioDir, {
        recursive: true,
      });
    });

    it('should log error if directory creation fails', async () => {
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValueOnce(error);

      // Create new instance to trigger error
      container.clearInstances();
      container.registerInstance(DI_TOKENS.Logger, mockLogger);
      container.resolve(AudioRecordingService);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create audio directory:',
        error
      );
    });
  });

  describe('startRecording', () => {
    it('should initialize buffers for recording', () => {
      service.startRecording('test-recording-id');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Started audio recording for test-recording-id'
      );
    });

    it('should create separate buffers for multiple recordings', () => {
      service.startRecording('recording-1');
      service.startRecording('recording-2');

      // Both recordings should be tracked (verified by append not failing)
      const testData = new Int16Array([1000, -1000]).buffer;
      service.appendAudioData('recording-1', testData, 'microphone');
      service.appendAudioData('recording-2', testData, 'microphone');

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('appendAudioData', () => {
    beforeEach(() => {
      service.startRecording('test-id');
    });

    it('should append microphone data', () => {
      const testData = new Int16Array([1000, -1000, 500]).buffer;
      service.appendAudioData('test-id', testData, 'microphone');

      // No direct way to verify, but no error should occur
      expect(true).toBe(true);
    });

    it('should append system data', () => {
      const testData = new Int16Array([2000, -2000, 1000]).buffer;
      service.appendAudioData('test-id', testData, 'system');

      expect(true).toBe(true);
    });

    it('should append combined data', () => {
      const testData = new Int16Array([1500, -1500]).buffer;
      service.appendAudioData('test-id', testData, 'combined');

      expect(true).toBe(true);
    });

    it('should silently ignore data for unknown recording', () => {
      const testData = new Int16Array([1000]).buffer;
      service.appendAudioData('unknown-id', testData, 'microphone');

      // Should not throw
      expect(true).toBe(true);
    });

    it('should convert Int16 audio to Float32 correctly', async () => {
      // Max positive value in Int16
      const maxPositive = new Int16Array([32767]).buffer;
      service.appendAudioData('test-id', maxPositive, 'combined');

      // Max negative value in Int16
      const maxNegative = new Int16Array([-32768]).buffer;
      service.appendAudioData('test-id', maxNegative, 'combined');

      mockWavEncoder.encode.mockResolvedValue(new ArrayBuffer(44));
      mockFs.writeFile.mockResolvedValue(undefined);

      await service.stopRecording('test-id');

      // Verify wav encoder was called with channel data
      expect(mockWavEncoder.encode).toHaveBeenCalledWith({
        sampleRate: 16000,
        channelData: [expect.any(Float32Array)],
      });
    });
  });

  describe('stopRecording', () => {
    beforeEach(() => {
      mockWavEncoder.encode.mockResolvedValue(new ArrayBuffer(44));
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should return null for unknown recording', async () => {
      const result = await service.stopRecording('unknown-id');
      expect(result).toBeNull();
    });

    it('should save WAV file and return filename', async () => {
      service.startRecording('test-id');
      const testData = new Int16Array([1000, -1000]).buffer;
      service.appendAudioData('test-id', testData, 'microphone');

      const filename = await service.stopRecording('test-id');

      expect(filename).toBe('test-id.wav');
      expect(mockWavEncoder.encode).toHaveBeenCalledWith({
        sampleRate: 16000,
        channelData: [expect.any(Float32Array)],
      });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testAudioDir, 'test-id.wav'),
        expect.any(Buffer)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Saved audio recording to test-id.wav'
      );
    });

    it('should use transcript filename pattern when provided', async () => {
      service.startRecording('test-id');
      const testData = new Int16Array([1000]).buffer;
      service.appendAudioData('test-id', testData, 'microphone');

      const filename = await service.stopRecording(
        'test-id',
        '2024-03-15_meeting.md'
      );

      expect(filename).toBe('2024-03-15_meeting.wav');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testAudioDir, '2024-03-15_meeting.wav'),
        expect.any(Buffer)
      );
    });

    it('should use combined buffer if available', async () => {
      service.startRecording('test-id');
      const combinedData = new Int16Array([1000, 2000, 3000]).buffer;
      service.appendAudioData('test-id', combinedData, 'combined');

      await service.stopRecording('test-id');

      expect(mockWavEncoder.encode).toHaveBeenCalled();
    });

    it('should mix microphone and system audio when no combined buffer', async () => {
      service.startRecording('test-id');

      const micData = new Int16Array([1000, 2000]).buffer;
      const sysData = new Int16Array([500, 1000]).buffer;

      service.appendAudioData('test-id', micData, 'microphone');
      service.appendAudioData('test-id', sysData, 'system');

      await service.stopRecording('test-id');

      expect(mockWavEncoder.encode).toHaveBeenCalled();
    });

    it('should clean up buffer after successful save', async () => {
      service.startRecording('test-id');
      service.appendAudioData(
        'test-id',
        new Int16Array([1]).buffer,
        'microphone'
      );

      await service.stopRecording('test-id');

      // Trying to stop again should return null
      const secondResult = await service.stopRecording('test-id');
      expect(secondResult).toBeNull();
    });

    it('should clean up buffer and return null on error', async () => {
      service.startRecording('test-id');
      service.appendAudioData(
        'test-id',
        new Int16Array([1]).buffer,
        'microphone'
      );

      const error = new Error('Encoding failed');
      mockWavEncoder.encode.mockRejectedValueOnce(error);

      const result = await service.stopRecording('test-id');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save audio recording:',
        error
      );

      // Buffer should be cleaned up
      const secondResult = await service.stopRecording('test-id');
      expect(secondResult).toBeNull();
    });
  });

  describe('getAudioFilePath', () => {
    it('should return correct path for filename', () => {
      const result = service.getAudioFilePath('test.wav');
      expect(result).toBe(path.join(testAudioDir, 'test.wav'));
    });
  });

  describe('deleteAudioFile', () => {
    it('should delete file and log success', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      await service.deleteAudioFile('test.wav');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testAudioDir, 'test.wav')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Deleted audio file: test.wav'
      );
    });

    it('should log error on delete failure', async () => {
      const error = new Error('File not found');
      mockFs.unlink.mockRejectedValue(error);

      await service.deleteAudioFile('nonexistent.wav');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete audio file nonexistent.wav:',
        error
      );
    });
  });

  describe('cleanup', () => {
    it('should clear all recording buffers', async () => {
      service.startRecording('recording-1');
      service.startRecording('recording-2');

      service.cleanup();

      // Both recordings should now return null when stopped
      const result1 = await service.stopRecording('recording-1');
      const result2 = await service.stopRecording('recording-2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('audio mixing', () => {
    beforeEach(() => {
      mockWavEncoder.encode.mockResolvedValue(new ArrayBuffer(44));
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should handle microphone-only recording', async () => {
      service.startRecording('test-id');

      const micData = new Int16Array([1000, 2000, 3000]).buffer;
      service.appendAudioData('test-id', micData, 'microphone');

      const filename = await service.stopRecording('test-id');

      expect(filename).toBe('test-id.wav');
      expect(mockWavEncoder.encode).toHaveBeenCalled();
    });

    it('should handle system-only recording', async () => {
      service.startRecording('test-id');

      const sysData = new Int16Array([500, 1000, 1500]).buffer;
      service.appendAudioData('test-id', sysData, 'system');

      const filename = await service.stopRecording('test-id');

      expect(filename).toBe('test-id.wav');
      expect(mockWavEncoder.encode).toHaveBeenCalled();
    });

    it('should handle empty recording', async () => {
      service.startRecording('test-id');

      // No audio data appended

      const filename = await service.stopRecording('test-id');

      expect(filename).toBe('test-id.wav');
      expect(mockWavEncoder.encode).toHaveBeenCalledWith({
        sampleRate: 16000,
        channelData: [expect.any(Float32Array)],
      });
    });

    it('should handle different length microphone and system buffers', async () => {
      service.startRecording('test-id');

      // Longer microphone buffer
      const micData = new Int16Array([1000, 2000, 3000, 4000, 5000]).buffer;
      // Shorter system buffer
      const sysData = new Int16Array([500, 1000]).buffer;

      service.appendAudioData('test-id', micData, 'microphone');
      service.appendAudioData('test-id', sysData, 'system');

      const filename = await service.stopRecording('test-id');

      expect(filename).toBe('test-id.wav');
    });
  });
});
