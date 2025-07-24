window.AudioProcessing = (function () {
  let microphoneWorkletNode = null;
  let systemAudioWorkletNode = null;
  let microphoneAudioContext = null;
  let systemAudioContext = null;

  async function startAudioProcessing(processedStream, systemStream) {
    microphoneAudioContext = new AudioContext({ sampleRate: 16000 });

    await microphoneAudioContext.audioWorklet.addModule('./audio-processor.js');

    const micSource =
      microphoneAudioContext.createMediaStreamSource(processedStream);
    microphoneWorkletNode = new AudioWorkletNode(
      microphoneAudioContext,
      'audio-processor'
    );

    microphoneWorkletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        window.electronAPI.sendMicrophoneAudio(event.data.data);
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

      systemAudioWorkletNode.port.onmessage = (event) => {
        if (event.data.type === 'audioData') {
          window.electronAPI.sendSystemAudio(event.data.data);
        }
      };

      systemSource.connect(systemAudioWorkletNode);
      systemAudioWorkletNode.connect(systemAudioContext.destination);
    }
  }

  function stopAudioProcessing() {
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
      microphoneAudioContext.close();
      microphoneAudioContext = null;
    }

    if (systemAudioContext) {
      systemAudioContext.close();
      systemAudioContext = null;
    }
  }

  function setRecordingState(isRecording) {
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

  return {
    startAudioProcessing,
    stopAudioProcessing,
    setRecordingState,
  };
})();
