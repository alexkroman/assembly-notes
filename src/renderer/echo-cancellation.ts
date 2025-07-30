let echoCancellationContext: AudioContext | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let systemAudioSource: MediaStreamAudioSourceNode | null = null;
let echoCancelledDestination: MediaStreamAudioDestinationNode | null = null;
let echoCancelledStream: MediaStream | null = null;

function createEchoCancellationProcessor(): AudioContext {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!AudioCtx) {
    throw new Error('Audio context not supported');
  }

  echoCancellationContext = new AudioCtx();

  echoCancelledDestination =
    echoCancellationContext.createMediaStreamDestination();

  return echoCancellationContext;
}

export function processEchoCancellation(
  micStream: MediaStream,
  systemStream: MediaStream
): MediaStream {
  if (!echoCancellationContext) {
    createEchoCancellationProcessor();
  }

  if (!echoCancellationContext || !echoCancelledDestination) {
    throw new Error('Audio context not properly initialized');
  }

  microphoneSource = echoCancellationContext.createMediaStreamSource(micStream);
  systemAudioSource =
    echoCancellationContext.createMediaStreamSource(systemStream);

  const delayNode = echoCancellationContext.createDelay(1.0);
  delayNode.delayTime.setValueAtTime(0.1, echoCancellationContext.currentTime);

  const micGain = echoCancellationContext.createGain();
  const systemGain = echoCancellationContext.createGain();
  const echoGain = echoCancellationContext.createGain();

  micGain.gain.setValueAtTime(1.0, echoCancellationContext.currentTime);
  systemGain.gain.setValueAtTime(0.8, echoCancellationContext.currentTime);
  echoGain.gain.setValueAtTime(-0.5, echoCancellationContext.currentTime);

  systemAudioSource.connect(delayNode);
  delayNode.connect(echoGain);

  microphoneSource.connect(micGain);
  micGain.connect(echoCancelledDestination);

  echoGain.connect(echoCancelledDestination);

  systemAudioSource.connect(systemGain);
  systemGain.connect(echoCancelledDestination);

  echoCancelledStream = echoCancelledDestination.stream;

  return echoCancelledStream;
}

export function cleanupEchoCancellation(): void {
  if (microphoneSource) {
    microphoneSource.disconnect();
    microphoneSource = null;
  }
  if (systemAudioSource) {
    systemAudioSource.disconnect();
    systemAudioSource = null;
  }
  if (echoCancellationContext) {
    void echoCancellationContext.close();
    echoCancellationContext = null;
  }
  if (echoCancelledStream) {
    echoCancelledStream.getTracks().forEach((track) => {
      track.stop();
    });
    echoCancelledStream = null;
  }
  echoCancelledDestination = null;
}

declare global {
  interface Window {
    EchoCancellation: {
      processEchoCancellation: (
        micStream: MediaStream,
        systemStream: MediaStream
      ) => MediaStream;
      cleanupEchoCancellation: () => void;
    };
  }
}

(
  window as Window & {
    EchoCancellation: {
      processEchoCancellation: (
        micStream: MediaStream,
        systemStream: MediaStream
      ) => MediaStream;
      cleanupEchoCancellation: () => void;
    };
  }
).EchoCancellation = {
  processEchoCancellation,
  cleanupEchoCancellation,
};
