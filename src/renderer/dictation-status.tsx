import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './dictation-status.css';

function DictationStatus() {
  const [isDictating, setIsDictating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // @ts-expect-error - Using the dictation status update listener
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (window.electronAPI?.onDictationStatusUpdate) {
      // @ts-expect-error - Using the dictation status update listener
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      window.electronAPI.onDictationStatusUpdate((status: boolean) => {
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
