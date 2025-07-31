import React, { useEffect, useState } from 'react';

import { useAppSelector } from '../hooks/redux.js';

interface SlackInstallation {
  teamId: string;
  teamName: string;
  botToken: string;
  botUserId: string;
  scope: string;
  installedAt: number;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export const SlackOAuthSection: React.FC = () => {
  const settings = useAppSelector((state) => state.settings);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentInstallation = settings.slackInstallations.find(
    (inst: SlackInstallation) =>
      inst.teamId === settings.selectedSlackInstallation
  );

  const selectedChannel = settings.availableChannels.find(
    (ch: SlackChannel) => ch.id === settings.selectedChannelId
  );

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

    // Cleanup listeners on unmount
    return () => {
      // Note: electronAPI doesn't expose removeListener, so we rely on component unmount
    };
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await window.electronAPI.slackOAuthInitiate();
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to initiate OAuth');
    }
  };

  const handleDisconnect = async () => {
    if (!currentInstallation) return;
    try {
      await window.electronAPI.slackOAuthRemoveInstallation(
        currentInstallation.teamId
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleRefreshChannels = async () => {
    if (!currentInstallation) return;
    try {
      await window.electronAPI.slackOAuthRefreshChannels(
        currentInstallation.teamId
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh channels'
      );
    }
  };

  const handleChannelChange = async (channelId: string) => {
    try {
      await window.electronAPI.saveSettings({
        selectedChannelId: channelId,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save channel selection'
      );
    }
  };

  if (!currentInstallation) {
    return (
      <div className="slack-oauth-section">
        <div className="oauth-status">
          <span className="status-text">Not connected to Slack</span>
        </div>
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
        <div
          className="oauth-help"
          style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}
        >
          This will open a Slack authorization window where you can connect
          Assembly Notes to your workspace.
        </div>
      </div>
    );
  }

  return (
    <div className="slack-oauth-section">
      <div className="oauth-status">
        <span className="status-text">
          ✅ Connected to <strong>{currentInstallation.teamName}</strong>
        </span>
      </div>

      <div className="channel-selection" style={{ marginTop: '12px' }}>
        <label
          htmlFor="slack-channel-select"
          style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}
        >
          Default Channel:
        </label>
        <select
          id="slack-channel-select"
          value={settings.selectedChannelId ?? ''}
          onChange={(e) => {
            void handleChannelChange(e.target.value);
          }}
          style={{ width: '100%', padding: '4px' }}
        >
          <option value="">Choose a channel...</option>
          {settings.availableChannels.map((channel: SlackChannel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.name} {channel.isPrivate ? '🔒' : ''}
            </option>
          ))}
        </select>
        {selectedChannel && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Selected: #{selectedChannel.name}
          </div>
        )}
      </div>

      <div
        className="oauth-actions"
        style={{ marginTop: '12px', display: 'flex', gap: '8px' }}
      >
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            void handleRefreshChannels();
          }}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          Refresh Channels
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            void handleDisconnect();
          }}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          Disconnect
        </button>
      </div>

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
