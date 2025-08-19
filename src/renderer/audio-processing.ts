let microphoneWorkletNode: AudioWorkletNode | null = null;
let systemAudioWorkletNode: AudioWorkletNode | null = null;
let combinedWorkletNode: AudioWorkletNode | null = null;
let microphoneAudioContext: AudioContext | null = null;
let systemAudioContext: AudioContext | null = null;
let combinedAudioContext: AudioContext | null = null;

export async function startAudioProcessing(
  micStream: MediaStream,
  systemStream: MediaStream | null,
  useCombinedMode = false,
  microphoneGainValue = 1.0,
  systemAudioGainValue = 0.7
): Promise<void> {
  // If we want to use combined mode and have both streams, mix them properly
  if (useCombinedMode && systemStream) {
    combinedAudioContext = new AudioContext({ sampleRate: 16000 });
    await combinedAudioContext.audioWorklet.addModule('./audio-processor.js');

    // Create a mixer node to combine the audio sources
    const mixerNode = combinedAudioContext.createGain();
    mixerNode.gain.value = 1.0;

    // Create source for microphone (with echo cancellation)
    const micSource = combinedAudioContext.createMediaStreamSource(micStream);
    const micGain = combinedAudioContext.createGain();
    micGain.gain.value = microphoneGainValue; // Use configurable microphone volume
    micSource.connect(micGain);
    micGain.connect(mixerNode);

    // Create source for system audio
    const systemSource =
      combinedAudioContext.createMediaStreamSource(systemStream);
    const systemGain = combinedAudioContext.createGain();
    systemGain.gain.value = systemAudioGainValue; // Use configurable system audio volume
    systemSource.connect(systemGain);
    systemGain.connect(mixerNode);

    // Connect mixer to the worklet
    combinedWorkletNode = new AudioWorkletNode(
      combinedAudioContext,
      'audio-processor'
    );

    combinedWorkletNode.port.onmessage = (event: MessageEvent) => {
      const data = event.data as { type: string; data: ArrayBuffer };
      if (data.type === 'audioData') {
        // Send combined audio as a single stream to the microphone channel
        window.electronAPI.sendMicrophoneAudio(data.data);
      }
    };

    mixerNode.connect(combinedWorkletNode);

    window.logger.info(
      `Using combined audio stream with mixing (mic: ${String(microphoneGainValue)}, system: ${String(systemAudioGainValue)}) and echo cancellation`
    );
    return;
  }

  // Fallback to separate streams (for dictation mode or if combined stream fails)
  microphoneAudioContext = new AudioContext({ sampleRate: 16000 });

  await microphoneAudioContext.audioWorklet.addModule('./audio-processor.js');

  const micSource = microphoneAudioContext.createMediaStreamSource(micStream);
  microphoneWorkletNode = new AudioWorkletNode(
    microphoneAudioContext,
    'audio-processor'
  );

  microphoneWorkletNode.port.onmessage = (event: MessageEvent) => {
    const data = event.data as { type: string; data: ArrayBuffer };
    if (data.type === 'audioData') {
      window.electronAPI.sendMicrophoneAudio(data.data);
    }
  };

  micSource.connect(microphoneWorkletNode);
  // Audio worklet processes and sends data via postMessage - no need to connect to destination

  if (systemStream) {
    systemAudioContext = new AudioContext({ sampleRate: 16000 });

    await systemAudioContext.audioWorklet.addModule('./audio-processor.js');

    const systemSource =
      systemAudioContext.createMediaStreamSource(systemStream);
    systemAudioWorkletNode = new AudioWorkletNode(
      systemAudioContext,
      'audio-processor'
    );

    systemAudioWorkletNode.port.onmessage = (event: MessageEvent) => {
      const data = event.data as { type: string; data: ArrayBuffer };
      if (data.type === 'audioData') {
        window.electronAPI.sendSystemAudio(data.data);
      }
    };

    systemSource.connect(systemAudioWorkletNode);
    // Audio worklet processes and sends data via postMessage - no need to connect to destination
  }
}

export function stopAudioProcessing(): void {
  if (combinedWorkletNode) {
    combinedWorkletNode.port.postMessage({
      type: 'setRecording',
      value: false,
    });
    combinedWorkletNode.disconnect();
    combinedWorkletNode = null;
  }

  if (microphoneWorkletNode) {
    microphoneWorkletNode.port.postMessage({
      type: 'setRecording',
      value: false,
    });
    microphoneWorkletNode.disconnect();
    microphoneWorkletNode = null;
  }

  if (systemAudioWorkletNode) {
    systemAudioWorkletNode.port.postMessage({
      type: 'setRecording',
      value: false,
    });
    systemAudioWorkletNode.disconnect();
    systemAudioWorkletNode = null;
  }

  if (combinedAudioContext) {
    void combinedAudioContext.close();
    combinedAudioContext = null;
  }

  if (microphoneAudioContext) {
    void microphoneAudioContext.close();
    microphoneAudioContext = null;
  }

  if (systemAudioContext) {
    void systemAudioContext.close();
    systemAudioContext = null;
  }
}

export function setRecordingState(isRecording: boolean): void {
  if (combinedWorkletNode) {
    combinedWorkletNode.port.postMessage({
      type: 'setRecording',
      value: isRecording,
    });
  }
  if (microphoneWorkletNode) {
    microphoneWorkletNode.port.postMessage({
      type: 'setRecording',
      value: isRecording,
    });
  }
  if (systemAudioWorkletNode) {
    systemAudioWorkletNode.port.postMessage({
      type: 'setRecording',
      value: isRecording,
    });
  }
}

declare global {
  interface Window {
    AudioProcessing: {
      startAudioProcessing: (
        micStream: MediaStream,
        systemStream: MediaStream | null,
        useCombinedMode?: boolean,
        microphoneGain?: number,
        systemAudioGain?: number
      ) => Promise<void>;
      stopAudioProcessing: () => void;
      setRecordingState: (recording: boolean) => void;
    };
  }
}

// Only assign to window if it's available (browser environment)
if (typeof window !== 'undefined') {
  (
    window as Window & { AudioProcessing: typeof window.AudioProcessing }
  ).AudioProcessing = {
    startAudioProcessing,
    stopAudioProcessing,
    setRecordingState,
  };
}
