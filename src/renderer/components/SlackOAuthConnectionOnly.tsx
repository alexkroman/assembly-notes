import React, { useEffect, useState } from 'react';

import { useAppSelector } from '../hooks/redux.js';

interface SlackOAuthConnectionOnlyProps {
  clientId?: string;
  clientSecret?: string;
}

export const SlackOAuthConnectionOnly: React.FC<
  SlackOAuthConnectionOnlyProps
> = ({ clientId = '', clientSecret = '' }) => {
  const settings = useAppSelector((state) => state.settings);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentInstallation = settings.slackInstallation;

  useEffect(() => {
    // Listen for OAuth success/error events
    const handleOAuthSuccess = () => {
      setIsConnecting(false);
      setError(null);
      // Settings will be updated automatically via Redux
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
      <div className="slack-oauth-section">
        <button
          type="button"
          className="btn-primary oauth-button"
          onClick={() => {
            void handleConnect();
          }}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect to Slack'}
        </button>
        {error && (
          <div
            className="error-message"
            style={{ color: '#ff4444', fontSize: '12px', marginTop: '8px' }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="slack-oauth-section">
      <button
        type="button"
        className="btn-primary oauth-button btn-danger"
        onClick={() => {
          void handleDisconnect();
        }}
      >
        Disconnect from Slack
      </button>
      {error && (
        <div
          className="error-message"
          style={{ color: '#ff4444', fontSize: '12px', marginTop: '8px' }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
