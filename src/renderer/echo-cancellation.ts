let echoCancellationContext: AudioContext | null = null;
let microphoneSource: MediaStreamAudioSourceNode | null = null;
let systemAudioSource: MediaStreamAudioSourceNode | null = null;
let echoCancelledDestination: MediaStreamAudioDestinationNode | null = null;
let echoCancelledStream: MediaStream | null = null;
// eslint-disable-next-line @typescript-eslint/no-deprecated
let scriptProcessor: ScriptProcessorNode | null = null;

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
  try {
    if (!echoCancellationContext) {
      createEchoCancellationProcessor();
    }

    if (!echoCancellationContext || !echoCancelledDestination) {
      throw new Error('Audio context not properly initialized');
    }

    microphoneSource =
      echoCancellationContext.createMediaStreamSource(micStream);
    systemAudioSource =
      echoCancellationContext.createMediaStreamSource(systemStream);

    // Create a simple subtractive echo canceller
    const micGain = echoCancellationContext.createGain();
    const systemGain = echoCancellationContext.createGain();
    const delayNode = echoCancellationContext.createDelay(1.0);

    // Set initial values
    micGain.gain.setValueAtTime(1.0, echoCancellationContext.currentTime);
    systemGain.gain.setValueAtTime(-0.7, echoCancellationContext.currentTime); // Negative gain for subtraction
    delayNode.delayTime.setValueAtTime(
      0.05,
      echoCancellationContext.currentTime
    ); // 50ms typical delay

    // Connect the graph:
    // 1. Microphone goes through gain to destination
    microphoneSource.connect(micGain);
    micGain.connect(echoCancelledDestination);

    // 2. System audio goes through delay and inverted gain to destination
    // This subtracts the delayed system audio from the microphone
    systemAudioSource.connect(delayNode);
    delayNode.connect(systemGain);
    systemGain.connect(echoCancelledDestination);

    echoCancelledStream = echoCancelledDestination.stream;

    return echoCancelledStream;
  } catch (error) {
    window.logger.error('Error in processEchoCancellation:', error);
    // If echo cancellation fails, return the original microphone stream
    return micStream;
  }
}

export function cleanupEchoCancellation(): void {
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
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
