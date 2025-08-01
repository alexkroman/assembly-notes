import React, { useEffect, useState } from 'react';

import type { ChannelModalProps } from '../../types/components.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setStatus } from '../store';
import { Modal } from './Modal.js';

export const ChannelModal: React.FC<ChannelModalProps> = ({ onClose }) => {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const [localChannelValue, setLocalChannelValue] = useState<string>('');

  const currentInstallation = settings.slackInstallation;

  // Initialize local channel value from settings
  useEffect(() => {
    const channelValue = settings.slackChannels || '';
    setLocalChannelValue(channelValue);
  }, [settings.slackChannels]);

  const handleChannelListChange = (channelList: string) => {
    // Update local state immediately for responsive UI
    setLocalChannelValue(channelList);
  };

  const handleSave = async () => {
    if (!currentInstallation) {
      dispatch(setStatus('No Slack workspace connected'));
      return;
    }

    try {
      // Save the channels
      await window.electronAPI.saveSettings({
        slackChannels: localChannelValue,
      });

      const channelCount = localChannelValue.trim()
        ? localChannelValue
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean).length
        : 0;

      dispatch(setStatus(`${String(channelCount)} favorite channels saved`));
      onClose();
    } catch {
      dispatch(setStatus('Error saving favorite channels'));
    }
  };

  if (!currentInstallation) {
    return (
      <Modal
        title="Manage Slack Channels"
        onClose={onClose}
        size="large"
        testId="channel-modal"
        footer={
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        }
      >
        <div className="no-connection-message">
          <p>
            No Slack workspace connected. Please connect to Slack in Settings
            first.
          </p>
        </div>
      </Modal>
    );
  }

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
      title="Manage Favorite Slack Channels"
      onClose={onClose}
      footer={footer}
      size="large"
      testId="channel-modal"
    >
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label
          htmlFor="slack-channels-textarea"
          style={{
            fontSize: '14px',
            display: 'block',
            marginBottom: '8px',
          }}
        >
          Favorite Channels (comma-separated):
        </label>
        <textarea
          id="slack-channels-textarea"
          value={localChannelValue}
          onChange={(e) => {
            handleChannelListChange(e.target.value);
          }}
          placeholder="general, random, team-updates"
          rows={4}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
          }}
        />
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '4px',
          }}
        >
          Enter channel names without # symbol. Bot must be invited to private
          channels.
        </div>
      </div>
    </Modal>
  );
};
