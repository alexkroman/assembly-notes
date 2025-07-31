let microphoneWorkletNode: AudioWorkletNode | null = null;
let systemAudioWorkletNode: AudioWorkletNode | null = null;
let microphoneAudioContext: AudioContext | null = null;
let systemAudioContext: AudioContext | null = null;

export async function startAudioProcessing(
  micStream: MediaStream,
  systemStream: MediaStream | null
): Promise<void> {
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
  microphoneWorkletNode.connect(microphoneAudioContext.destination);

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
    systemAudioWorkletNode.connect(systemAudioContext.destination);
  }
}

export function stopAudioProcessing(): void {
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
        systemStream: MediaStream | null
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
