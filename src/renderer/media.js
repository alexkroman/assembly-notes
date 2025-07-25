const { processEchoCancellation, cleanupEchoCancellation } =
  window.EchoCancellation;

let microphoneStream = null;
let systemAudioStream = null;

export async function acquireStreams() {
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };

  microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);

  await window.electronAPI.enableLoopbackAudio();

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true,
  });

  await window.electronAPI.disableLoopbackAudio();

  const videoTracks = displayStream
    .getTracks()
    .filter((t) => t.kind === 'video');
  videoTracks.forEach((t) => {
    t.stop();
    displayStream.removeTrack(t);
  });

  systemAudioStream = displayStream;

  const processedStream = processEchoCancellation(
    microphoneStream,
    systemAudioStream
  );

  return {
    microphoneStream,
    systemAudioStream,
    processedStream,
  };
}

export function releaseStreams() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
  }

  if (systemAudioStream) {
    systemAudioStream.getTracks().forEach((track) => track.stop());
    systemAudioStream = null;
  }

  cleanupEchoCancellation();
}

export function monitorStream(stream, type, onDisconnect) {
  stream.getTracks().forEach((track) => {
    track.onended = () => {
      window.logger.warn(`${type} track ended unexpectedly`);
      onDisconnect();
    };
  });
}
