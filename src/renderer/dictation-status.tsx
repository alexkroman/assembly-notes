import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import './dictation-status.css';
import startSound from './assets/sounds/dictation-start.mp3';
import stopSound from './assets/sounds/dictation-stop.mp3';

function DictationStatus() {
  const [isDictating, setIsDictating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio files with reduced volume
    startAudioRef.current = new Audio(startSound);
    stopAudioRef.current = new Audio(stopSound);

    // Set volume to 20% (0.2 out of 1.0)
    startAudioRef.current.volume = 0.2;
    stopAudioRef.current.volume = 0.2;

    // @ts-expect-error - Using the dictation status update listener
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (window.electronAPI?.onDictationStatusUpdate) {
      // @ts-expect-error - Using the dictation status update listener
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.electronAPI.onDictationStatusUpdate((status: boolean) => {
        // Play appropriate sound
        if (status) {
          void startAudioRef.current?.play();
        } else {
          void stopAudioRef.current?.play();
        }

        setIsDictating(status);
        setIsAnimating(status);
      });
    }
  }, []);

  const isMac = navigator.userAgent.toUpperCase().includes('MAC');
  const shortcut = isMac ? 'Ctrl+Opt+D' : 'Ctrl+Alt+D';

  return (
    <div className={`dictation-status ${isDictating ? 'active' : 'inactive'}`}>
      <div className="status-indicator">
        <div className={`status-dot ${isAnimating ? 'pulsing' : ''}`} />
        <span className="status-text">
          {isDictating ? 'Dictating' : 'Not Dictating'}
        </span>
        <span className="shortcut-text">({shortcut})</span>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DictationStatus />);
}
