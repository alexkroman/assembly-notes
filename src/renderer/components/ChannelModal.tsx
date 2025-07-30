import React, { useState, useEffect } from 'react';

import type { ChannelModalProps } from '../../types/components.js';
import { useAppDispatch } from '../hooks/redux';
import { setStatus } from '../store';

export const ChannelModal: React.FC<ChannelModalProps> = ({ onClose }) => {
  const [channelsText, setChannelsText] = useState('');
  const dispatch = useAppDispatch();

  useEffect(() => {
    void loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      const channelsString = settings.slackChannels || '';
      setChannelsText(channelsString);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const handleSave = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      await window.electronAPI.saveSettings({
        ...settings,
        slackChannels: channelsText.trim(),
      });
      dispatch(setStatus('Slack channels saved successfully'));
      window.dispatchEvent(new CustomEvent('settings-saved'));
      onClose();
    } catch (error) {
      console.error('Error saving channels:', error);
      dispatch(setStatus('Error saving Slack channels'));
    }
  };

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
          <div className="form-group">
            <label htmlFor="slackChannels">
              Slack Channels (comma-separated):
            </label>
            <textarea
              id="slackChannels"
              value={channelsText}
              onChange={(e) => {
                setChannelsText(e.target.value);
              }}
              placeholder="general, team-updates, meetings"
              rows={4}
            />
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
