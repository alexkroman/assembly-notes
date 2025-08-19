import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import './assets/tailwind.css';
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
    <div
      className={`w-full h-10 flex items-center justify-center backdrop-blur-sm rounded-lg px-4 transition-all duration-300 ease-in-out ${
        isDictating
          ? 'bg-green-500/95 border border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
          : 'bg-gray-800/90 border border-white/10'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${
            isDictating
              ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
              : 'bg-gray-500'
          } ${isAnimating ? 'animate-pulse-custom' : ''}`}
        />
        <span
          className={`text-sm font-medium tracking-[0.5px] mr-2 ${
            isDictating ? 'text-white font-semibold' : 'text-white'
          }`}
        >
          {isDictating ? 'Dictating' : 'Not Dictating'}
        </span>
        <span
          className={`text-xs font-normal tracking-[0.3px] ${
            isDictating ? 'text-white/90' : 'text-white/60'
          }`}
        >
          ({shortcut})
        </span>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DictationStatus />);
}
