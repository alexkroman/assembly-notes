class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;

    // Listen for messages from the main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'setRecording') {
        this.isRecording = event.data.value;
      }
    };
  }

  process(inputs) {
    if (!this.isRecording) return true;

    const input = inputs[0];
    if (input && input.length > 0) {
      const inputData = input[0]; // First channel

      if (inputData && inputData.length > 0) {
        // Convert float32 to int16
        const int16Buffer = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Send audio data to main thread
        this.port.postMessage({
          type: 'audioData',
          data: Array.from(new Uint8Array(int16Buffer.buffer)),
        });
      }
    }

    return true; // Keep the processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
