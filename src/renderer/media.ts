import { cleanupEchoCancellation } from './echo-cancellation';

let microphoneStream: MediaStream | null = null;
let systemAudioStream: MediaStream | null = null;

export async function acquireStreams(isDictationMode = false): Promise<{
  microphoneStream: MediaStream;
  systemAudioStream: MediaStream | null;
}> {
  try {
    const constraints = {
      audio: {
        // Core audio processing for meeting scenarios
        echoCancellation: true, // Critical for removing Zoom audio from your mic
        noiseSuppression: true, // Reduces background noise
        autoGainControl: true, // Normalizes your voice volume

        // Google-specific enhancements (Chrome)
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true, // Removes low-frequency rumble
        googTypingNoiseDetection: true, // Filters keyboard noise

        // Additional meeting-optimized constraints
        googAudioMirroring: false, // Prevents audio feedback loops
        googNoiseReduction: true, // Extra noise reduction

        // Optimize for speech (meetings are primarily voice)
        sampleRate: 16000, // Optimal for speech recognition
        sampleSize: 16, // Good quality for speech
        channelCount: 1, // Mono is fine for speech
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

    // Audio will be mixed in the audio processing stage
    // Chrome's echo cancellation on the microphone will remove the system audio echo
    window.logger.info(
      'Streams acquired, will be mixed with echo cancellation in audio processor'
    );

    return {
      microphoneStream,
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
