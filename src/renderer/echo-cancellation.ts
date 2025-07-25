let echoCancellationContext: AudioContext | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let systemAudioSource: MediaStreamAudioSourceNode | null = null;
let echoCancelledDestination: MediaStreamAudioDestinationNode | null = null;
let echoCancelledStream: MediaStream | null = null;

function createEchoCancellationProcessor(): AudioContext {
  echoCancellationContext = new AudioContext();

  echoCancelledDestination =
    echoCancellationContext.createMediaStreamDestination();

  return echoCancellationContext;
}

export function processEchoCancellation(micStream: MediaStream, systemStream: MediaStream): MediaStream {
  if (!echoCancellationContext) {
    createEchoCancellationProcessor();
  }

  microphoneSource =
    echoCancellationContext!.createMediaStreamSource(micStream);
  systemAudioSource =
    echoCancellationContext!.createMediaStreamSource(systemStream);

  const delayNode = echoCancellationContext!.createDelay(1.0);
  delayNode.delayTime.setValueAtTime(
    0.1,
    echoCancellationContext!.currentTime
  );

  const micGain = echoCancellationContext!.createGain();
  const systemGain = echoCancellationContext!.createGain();
  const echoGain = echoCancellationContext!.createGain();

  micGain.gain.setValueAtTime(1.0, echoCancellationContext!.currentTime);
  systemGain.gain.setValueAtTime(0.8, echoCancellationContext!.currentTime);
  echoGain.gain.setValueAtTime(-0.5, echoCancellationContext!.currentTime);

  systemAudioSource.connect(delayNode);
  delayNode.connect(echoGain);

  microphoneSource.connect(micGain);
  micGain.connect(echoCancelledDestination!);

  echoGain.connect(echoCancelledDestination!);

  systemAudioSource.connect(systemGain);
  systemGain.connect(echoCancelledDestination!);

  echoCancelledStream = echoCancelledDestination!.stream;

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
    echoCancellationContext.close();
    echoCancellationContext = null;
  }
  if (echoCancelledStream) {
    echoCancelledStream.getTracks().forEach((track) => track.stop());
    echoCancelledStream = null;
  }
  echoCancelledDestination = null;
}