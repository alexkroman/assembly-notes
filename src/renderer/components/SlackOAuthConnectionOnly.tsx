import React, { useEffect, useState } from 'react';

import { useAppSelector, useAppDispatch } from '../hooks/redux.js';
import { apiSlice } from '../slices/apiSlice.js';

interface SlackOAuthConnectionOnlyProps {
  clientId?: string;
  clientSecret?: string;
}

export const SlackOAuthConnectionOnly: React.FC<
  SlackOAuthConnectionOnlyProps
> = ({ clientId = '', clientSecret = '' }) => {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentInstallation = settings.slackInstallation;

  useEffect(() => {
    // Listen for OAuth success/error events
    const handleOAuthSuccess = () => {
      setIsConnecting(false);
      setError(null);
      // Invalidate settings query to ensure UI updates
      dispatch(apiSlice.util.invalidateTags(['Settings']));
    };

    const handleOAuthError = (errorMessage: string) => {
      setIsConnecting(false);
      setError(errorMessage);
    };

    window.electronAPI.onSlackOAuthSuccess(handleOAuthSuccess);
    window.electronAPI.onSlackOAuthError(handleOAuthError);

    // Note: electronAPI doesn't expose removeListener, so we rely on component unmount
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await window.electronAPI.slackOAuthInitiate(clientId, clientSecret);
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to initiate OAuth');
    }
  };

  const handleDisconnect = async () => {
    if (!currentInstallation) return;
    try {
      await window.electronAPI.slackOAuthRemoveInstallation();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  if (!currentInstallation) {
    return (
      <div className="text-sm">
        <button
          type="button"
          className="btn-primary px-2.5 py-1 text-sm"
          onClick={() => {
            void handleConnect();
          }}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect to Slack'}
        </button>
        {error && <div className="text-danger text-xs mt-1">{error}</div>}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        className="btn-danger px-2.5 py-1 text-sm"
        onClick={() => {
          void handleDisconnect();
        }}
      >
        Disconnect from Slack
      </button>
      {error && <div className="text-danger text-xs mt-1">{error}</div>}
    </div>
  );
};
