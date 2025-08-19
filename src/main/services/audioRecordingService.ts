import fs from 'fs/promises';
import path from 'path';

import { app } from 'electron';
import { inject, injectable } from 'tsyringe';
import wavEncoder from 'wav-encoder';

import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';

interface AudioBuffer {
  microphone: Float32Array[];
  system: Float32Array[];
  combined?: Float32Array[]; // For combined stream mode
}

@injectable()
export class AudioRecordingService {
  private recordingBuffers = new Map<string, AudioBuffer>();
  private audioDir: string;
  private sampleRate = 16000;

  constructor(@inject(DI_TOKENS.Logger) private logger: typeof Logger) {
    // Create audio directory in user data
    const userData = app.getPath('userData');
    this.audioDir = path.join(userData, 'recordings');
    void this.ensureAudioDirectory();
  }

  private async ensureAudioDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.audioDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create audio directory:', error);
    }
  }

  startRecording(recordingId: string): void {
    this.recordingBuffers.set(recordingId, {
      microphone: [],
      system: [],
      combined: [],
    });
    this.logger.info(`Started audio recording for ${recordingId}`);
  }

  appendAudioData(
    recordingId: string,
    audioData: ArrayBuffer,
    source: 'microphone' | 'system' | 'combined'
  ): void {
    const buffer = this.recordingBuffers.get(recordingId);
    if (!buffer) {
      return;
    }

    // Convert Int16Array to Float32Array for wav-encoder
    const int16Data = new Int16Array(audioData);
    const float32Data = new Float32Array(int16Data.length);

    // Convert from int16 range (-32768 to 32767) to float32 range (-1 to 1)
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = (int16Data[i] ?? 0) / 32768.0;
    }

    // Handle combined stream separately
    if (source === 'combined') {
      buffer.combined ??= [];
      buffer.combined.push(float32Data);
    } else {
      buffer[source].push(float32Data);
    }
  }

  async stopRecording(recordingId: string): Promise<string | null> {
    const buffer = this.recordingBuffers.get(recordingId);
    if (!buffer) {
      return null;
    }

    try {
      // Use combined buffer if available, otherwise combine microphone and system
      const combinedBuffer =
        buffer.combined && buffer.combined.length > 0
          ? this.concatenateBuffers(buffer.combined)
          : this.combineAudioBuffers(buffer.microphone, buffer.system);

      // Generate filename
      const filename = `${recordingId}.wav`;
      const filepath = path.join(this.audioDir, filename);

      // Encode to WAV using wav-encoder
      const audioData = {
        sampleRate: this.sampleRate,
        channelData: [combinedBuffer], // Mono audio
      };

      const wavBuffer = await wavEncoder.encode(audioData);
      await fs.writeFile(filepath, Buffer.from(wavBuffer));

      // Clean up buffer
      this.recordingBuffers.delete(recordingId);

      this.logger.info(`Saved audio recording to ${filename}`);
      return filename;
    } catch (error) {
      this.logger.error('Failed to save audio recording:', error);
      this.recordingBuffers.delete(recordingId);
      return null;
    }
  }

  private combineAudioBuffers(
    micBuffers: Float32Array[],
    systemBuffers: Float32Array[]
  ): Float32Array {
    // Calculate total length
    const micLength = micBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const systemLength = systemBuffers.reduce(
      (sum, buf) => sum + buf.length,
      0
    );
    const maxLength = Math.max(micLength, systemLength);

    // Create combined buffer
    const combined = new Float32Array(maxLength);

    // Copy microphone data
    let offset = 0;
    for (const buf of micBuffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    // Mix in system audio
    offset = 0;
    for (const buf of systemBuffers) {
      for (let i = 0; i < buf.length; i++) {
        if (offset + i < combined.length) {
          // Mix audio by averaging and clamp to prevent overflow
          const mixedSample = ((combined[offset + i] ?? 0) + (buf[i] ?? 0)) / 2;
          combined[offset + i] = Math.max(-1, Math.min(1, mixedSample));
        }
      }
      offset += buf.length;
    }

    return combined;
  }

  private concatenateBuffers(buffers: Float32Array[]): Float32Array {
    // Calculate total length
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);

    // Create concatenated buffer
    const concatenated = new Float32Array(totalLength);

    // Copy all buffers
    let offset = 0;
    for (const buf of buffers) {
      concatenated.set(buf, offset);
      offset += buf.length;
    }

    return concatenated;
  }

  getAudioFilePath(filename: string): string {
    return path.join(this.audioDir, filename);
  }

  async deleteAudioFile(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.audioDir, filename);
      await fs.unlink(filepath);
      this.logger.info(`Deleted audio file: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete audio file ${filename}:`, error);
    }
  }

  cleanup(): void {
    this.recordingBuffers.clear();
  }
}
