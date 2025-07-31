class AudioProcessor extends AudioWorkletProcessor {
  private isRecording = false;
  private audioBuffer: Float32Array[] = [];
  private bufferSize = 4096; // Buffer size for audio chunks

  constructor() {
    super();

    // Handle messages from the main thread
    this.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === 'setRecording') {
        this.isRecording = value;
        if (!this.isRecording) {
          // Clear buffer when stopping recording
          this.audioBuffer = [];
        }
      }
    };
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    // Get the first input (mono audio)
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const inputChannel = input[0];
    if (!inputChannel) {
      return true;
    }

    // Only process audio when recording
    if (this.isRecording) {
      // Add the input data to our buffer
      this.audioBuffer.push(new Float32Array(inputChannel));

      // When we have enough data, send it to the main thread
      if (this.audioBuffer.length * inputChannel.length >= this.bufferSize) {
        // Concatenate all buffered audio data
        const totalLength = this.audioBuffer.reduce(
          (sum, buffer) => sum + buffer.length,
          0
        );
        const concatenated = new Float32Array(totalLength);

        let offset = 0;
        for (const buffer of this.audioBuffer) {
          concatenated.set(buffer, offset);
          offset += buffer.length;
        }

        // Convert to 16-bit PCM for efficient transmission
        const pcm16 = new Int16Array(concatenated.length);
        for (let i = 0; i < concatenated.length; i++) {
          // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
          const sample = Math.max(-1, Math.min(1, concatenated[i]));
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Send audio data to main thread
        this.port.postMessage(
          {
            type: 'audioData',
            data: pcm16.buffer,
          },
          [pcm16.buffer]
        );

        // Clear the buffer after sending
        this.audioBuffer = [];
      }
    }

    // Pass through audio to output (for monitoring)
    const output = outputs[0];
    if (output && output.length > 0) {
      const outputChannel = output[0];
      if (outputChannel) {
        outputChannel.set(inputChannel);
      }
    }

    return true;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
