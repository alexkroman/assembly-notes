import {
  cleanupEchoCancellation,
  processEchoCancellation,
} from './echo-cancellation';

let microphoneStream: MediaStream | null = null;
let systemAudioStream: MediaStream | null = null;

export async function acquireStreams(isDictationMode = false): Promise<{
  microphoneStream: MediaStream;
  systemAudioStream: MediaStream | null;
}> {
  const constraints = {
    audio: {
      echoCancellation: !isDictationMode, // Disable echo cancellation in dictation mode
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };

  microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);

  // In dictation mode, only use microphone (no system audio)
  if (isDictationMode) {
    return {
      microphoneStream,
      systemAudioStream: null,
    };
  }

  // Normal recording mode - capture system audio
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

  processEchoCancellation(microphoneStream, systemAudioStream);

  return {
    microphoneStream,
    systemAudioStream,
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
