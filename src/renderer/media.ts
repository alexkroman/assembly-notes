import {
  cleanupEchoCancellation,
  processEchoCancellation,
} from './echo-cancellation';

let microphoneStream: MediaStream | null = null;
let systemAudioStream: MediaStream | null = null;

export async function acquireStreams(): Promise<{
  microphoneStream: MediaStream;
  systemAudioStream: MediaStream;
  processedStream: MediaStream;
}> {
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

export function releaseStreams(): void {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach((track) => {
      track.stop();
    });
    microphoneStream = null;
  }

  if (systemAudioStream) {
    systemAudioStream.getTracks().forEach((track) => {
      track.stop();
    });
    systemAudioStream = null;
  }

  cleanupEchoCancellation();
}
