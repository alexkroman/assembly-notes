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
  try {
    const constraints = {
      audio: {
        echoCancellation: true, // Always enable browser's echo cancellation
        noiseSuppression: true,
        autoGainControl: true,
        // Additional constraints to improve echo cancellation
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
      } as MediaTrackConstraints,
      video: false,
    };

    window.logger.info('Acquiring microphone stream...');
    microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
    window.logger.info('Microphone stream acquired successfully');

    // In dictation mode, only use microphone (no system audio)
    if (isDictationMode) {
      return {
        microphoneStream,
        systemAudioStream: null,
      };
    }

    // Normal recording mode - capture system audio
    window.logger.info('Enabling loopback audio...');
    await window.electronAPI.enableLoopbackAudio();

    window.logger.info('Acquiring display media stream...');
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });

    // Remove video tracks that we don't need
    // Note: You may find bugs if you don't remove video tracks
    const videoTracks = displayStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.stop();
      displayStream.removeTrack(track);
    });

    await window.electronAPI.disableLoopbackAudio();

    systemAudioStream = displayStream;

    // Process echo cancellation to remove system audio from microphone
    window.logger.info('Processing echo cancellation...');
    const processedMicStream = processEchoCancellation(
      microphoneStream,
      systemAudioStream
    );
    window.logger.info('Echo cancellation processing complete');

    return {
      microphoneStream: processedMicStream,
      systemAudioStream,
    };
  } catch (error) {
    window.logger.error('Failed to acquire streams:', error);
    // Clean up any partially acquired streams
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
    throw error;
  }
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
