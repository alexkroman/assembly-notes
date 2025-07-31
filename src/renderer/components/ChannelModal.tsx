import React, { useState, useEffect } from 'react';

import type { ChannelModalProps } from '../../types/components.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setStatus } from '../store';

interface SlackInstallation {
  teamId: string;
  teamName: string;
}

export const ChannelModal: React.FC<ChannelModalProps> = ({ onClose }) => {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();

  const [favoriteChannelIds, setFavoriteChannelIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentInstallation = settings.slackInstallations.find(
    (inst: SlackInstallation) =>
      inst.teamId === settings.selectedSlackInstallation
  );

  const allChannels = settings.availableChannels;

  useEffect(() => {
    // Load current favorite channels (stored as comma-separated channel names for backwards compatibility)
    const favoriteChannelNames = settings.slackChannels
      ? settings.slackChannels
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

    // Convert channel names to IDs
    const favoriteIds = allChannels
      .filter((channel) => favoriteChannelNames.includes(channel.name))
      .map((channel) => channel.id);

    setFavoriteChannelIds(favoriteIds);
  }, [settings.slackChannels, allChannels]);

  const handleToggleChannel = (channelId: string) => {
    setFavoriteChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleRefreshChannels = async () => {
    if (!currentInstallation) {
      dispatch(setStatus('No Slack workspace connected'));
      return;
    }

    try {
      setIsRefreshing(true);
      await window.electronAPI.slackOAuthRefreshChannels(
        currentInstallation.teamId
      );
      dispatch(setStatus('Channels refreshed from Slack'));
    } catch (error) {
      console.error('Error refreshing channels:', error);
      dispatch(setStatus('Error refreshing channels'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    try {
      // Convert selected channel IDs back to names for storage
      const favoriteChannelNames = allChannels
        .filter((channel) => favoriteChannelIds.includes(channel.id))
        .map((channel) => channel.name);

      const channelsText = favoriteChannelNames.join(', ');

      await window.electronAPI.saveSettings({
        slackChannels: channelsText,
      });

      dispatch(
        setStatus(
          `${String(favoriteChannelNames.length)} favorite channels saved`
        )
      );
      window.dispatchEvent(new CustomEvent('settings-saved'));
      onClose();
    } catch (error) {
      console.error('Error saving favorite channels:', error);
      dispatch(setStatus('Error saving favorite channels'));
    }
  };

  if (!currentInstallation) {
    return (
      <div className="modal-overlay" data-testid="channel-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Manage Slack Channels</h2>
            <button
              className="modal-close"
              data-testid="close-modal-btn"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="no-connection-message">
              <p>
                No Slack workspace connected. Please connect to Slack in
                Settings first.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" data-testid="channel-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Manage Favorite Channels</h2>
          <button
            className="modal-close"
            data-testid="close-modal-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            className="workspace-info"
            style={{
              marginBottom: '16px',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
            }}
          >
            <strong>Workspace:</strong> {currentInstallation.teamName}
          </div>

          <div className="form-group">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <label>Select your favorite channels:</label>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  void handleRefreshChannels();
                }}
                disabled={isRefreshing}
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Channels'}
              </button>
            </div>

            <div
              className="channels-list"
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px',
              }}
            >
              {allChannels.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#888',
                    padding: '16px',
                  }}
                >
                  No channels found. Click "Refresh Channels" to load channels
                  from Slack.
                </div>
              ) : (
                allChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="channel-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 0',
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`channel-${channel.id}`}
                      checked={favoriteChannelIds.includes(channel.id)}
                      onChange={() => {
                        handleToggleChannel(channel.id);
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <label
                      htmlFor={`channel-${channel.id}`}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      #{channel.name} {channel.isPrivate ? '🔒' : ''}
                    </label>
                  </div>
                ))
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Selected: {favoriteChannelIds.length} channel
              {favoriteChannelIds.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              void handleSave();
            }}
          >
            Save Favorites
          </button>
        </div>
      </div>
    </div>
  );
};
