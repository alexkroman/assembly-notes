import React, { useEffect, useState } from 'react';

import type { ChannelModalProps } from '../../types/components.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setStatus } from '../store';
import { Modal } from './Modal.js';
import { useUpdateSettingsMutation } from '../store/api/apiSlice.js';

export const ChannelModal: React.FC<ChannelModalProps> = ({ onClose }) => {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const [updateSettings] = useUpdateSettingsMutation();
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
      await updateSettings({
        slackChannels: localChannelValue,
      }).unwrap();

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
        <div className="text-sm text-white/[0.70]">
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
      <div className="form-group">
        <label
          htmlFor="slack-channels-textarea"
          className="block mb-1 text-sm font-medium text-white/[0.85]"
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
          rows={3}
          className="form-input resize-vertical"
        />
        <div className="text-xs text-white/[0.60] mt-1">
          Enter channel names without # symbol. Bot must be invited to private
          channels.
        </div>
      </div>
    </Modal>
  );
};
