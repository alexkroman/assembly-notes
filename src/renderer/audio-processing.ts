let microphoneWorkletNode: AudioWorkletNode | null = null;
let systemAudioWorkletNode: AudioWorkletNode | null = null;
let microphoneAudioContext: AudioContext | null = null;
let systemAudioContext: AudioContext | null = null;

const SAMPLE_RATE = 16000;

async function initAudioWorklet(
  stream: MediaStream,
  onAudioData: (data: ArrayBuffer) => void
): Promise<{ node: AudioWorkletNode; ctx: AudioContext }> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.audioWorklet.addModule('./audio-processor.js');

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'audio-processor');

  node.port.onmessage = (event: MessageEvent) => {
    const msg = event.data as { type: string; data: ArrayBuffer };
    if (msg.type === 'audioData') {
      onAudioData(msg.data);
    }
  };

  source.connect(node);
  node.connect(ctx.destination);

  return { node, ctx };
}

export async function startAudioProcessing(
  micStream: MediaStream,
  systemStream: MediaStream | null
): Promise<void> {
  const mic = await initAudioWorklet(
    micStream,
    window.electronAPI.sendMicrophoneAudio
  );
  microphoneWorkletNode = mic.node;
  microphoneAudioContext = mic.ctx;

  if (systemStream) {
    const sys = await initAudioWorklet(
      systemStream,
      window.electronAPI.sendSystemAudio
    );
    systemAudioWorkletNode = sys.node;
    systemAudioContext = sys.ctx;
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

export function resetAudioProcessing(): void {
  setRecordingState(false);
  stopAudioProcessing();
  window.logger.info('Audio processing completely reset');
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
      resetAudioProcessing: () => void;
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
    resetAudioProcessing,
  };
}
