/**
 * Specialized error boundary for recording-related components
 */

import React from 'react';

import { ErrorBoundary } from './ErrorBoundary.js';
import { useAppDispatch } from '../hooks/redux.js';
import { recordingActions } from '../slices/syncActionTypes.js';

interface Props {
  children: React.ReactNode;
}

export const RecordingErrorBoundary: React.FC<Props> = ({ children }) => {
  const dispatch = useAppDispatch();

  const handleRecordingError = (error: Error): void => {
    // Dispatch error to Redux store
    dispatch(recordingActions.setError(error.message));
  };

  const recordingErrorFallback = (
    error: Error,
    resetError: () => void
  ): React.ReactNode => (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
        <h2 className="text-yellow-800 font-semibold mb-2">Recording Error</h2>
        <p className="text-yellow-700 mb-4">
          {error.message || 'An error occurred with the recording'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetError();
              dispatch(recordingActions.setError(''));
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Reset Recording
          </button>
          <button
            onClick={() => {
              void window.electronAPI.newRecording();
              resetError();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            New Recording
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={recordingErrorFallback}
      onError={handleRecordingError}
    >
      {children}
    </ErrorBoundary>
  );
};
