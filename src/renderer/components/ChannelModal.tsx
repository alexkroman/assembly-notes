import React, { useState, useEffect } from 'react';

import { Modal } from './Modal.js';
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
      setChannelsText(settings.slackChannels || '');
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

  const footer = (
    <>
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
    </>
  );

  return (
    <Modal
      title="Manage Slack Channels"
      onClose={onClose}
      footer={footer}
      overlayTestId="channel-modal"
    >
      <div className="form-group">
        <label htmlFor="slackChannels">Slack Channels (comma-separated):</label>
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
    </Modal>
  );
};
