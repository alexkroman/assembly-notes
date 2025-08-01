import React, { useEffect, useState } from 'react';

import type { SettingsModalProps } from '../../types/components.js';
import type { SettingsState } from '../../types/redux.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux.js';
import { setStatus } from '../store';
import { Modal } from './Modal.js';
import { SlackOAuthConnectionOnly } from './SlackOAuthConnectionOnly.js';
import '../../types/global.d.ts';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const reduxSettings = useAppSelector((state) => state.settings);
  const [settings, setSettings] = useState<SettingsState>(reduxSettings);
  const [slackClientId, setSlackClientId] = useState('');
  const [slackClientSecret, setSlackClientSecret] = useState('');
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Update local state when Redux state changes
    setSettings(reduxSettings);
  }, [reduxSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings.assemblyaiKey]);

  const handleSave = async () => {
    if (!(settings.assemblyaiKey || '').trim()) {
      return;
    }

    try {
      await window.electronAPI.saveSettings(settings);
      dispatch(setStatus('Settings saved successfully'));
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      dispatch(setStatus('Error saving settings'));
    }
  };

  const handleInputChange = (
    field: keyof SettingsState,
    value: string | boolean
  ) => {
    setSettings((prev: SettingsState) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (!(settings.assemblyaiKey || '').trim()) {
      return;
    }
    onClose();
  };

  const handleClose = () => {
    if (!(settings.assemblyaiKey || '').trim()) {
      return;
    }
    onClose();
  };

  const isAssemblyAIKeyMissing = !(settings.assemblyaiKey || '').trim();

  const footer = (
    <>
      <button
        className={`btn-secondary ${isAssemblyAIKeyMissing ? 'disabled' : ''}`}
        data-testid="cancel-settings-btn"
        onClick={handleCancel}
        disabled={isAssemblyAIKeyMissing}
      >
        Cancel
      </button>
      <button
        className={`btn-primary ${isAssemblyAIKeyMissing ? 'disabled' : ''}`}
        data-testid="save-settings-btn"
        onClick={() => {
          void handleSave();
        }}
        disabled={isAssemblyAIKeyMissing}
      >
        Save
      </button>
    </>
  );

  return (
    <Modal
      title="Settings"
      onClose={handleClose}
      footer={footer}
      size="large"
      testId="settings-modal"
      bodyTestId="slack-settings"
      closeDisabled={isAssemblyAIKeyMissing}
    >
      <div className="form-group">
        <label htmlFor="assemblyaiKey">AssemblyAI API Key (required):</label>
        <input
          type="password"
          id="assemblyaiKey"
          data-testid="assemblyai-key-input"
          value={settings.assemblyaiKey}
          onChange={(e) => {
            handleInputChange('assemblyaiKey', e.target.value);
          }}
          placeholder="Enter your AssemblyAI API key"
          className={isAssemblyAIKeyMissing ? 'error' : ''}
        />
      </div>

      {!settings.slackInstallation && (
        <div className="form-group">
          <label>Slack Credentials (optional):</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              id="slackClientId"
              data-testid="slack-client-id-input"
              value={slackClientId}
              onChange={(e) => {
                setSlackClientId(e.target.value);
              }}
              placeholder="Client ID"
              style={{ flex: 1 }}
            />
            <input
              type="password"
              id="slackClientSecret"
              data-testid="slack-client-secret-input"
              value={slackClientSecret}
              onChange={(e) => {
                setSlackClientSecret(e.target.value);
              }}
              placeholder="Client Secret"
              style={{ flex: 1 }}
            />
          </div>
        </div>
      )}

      {(Boolean(settings.slackInstallation) ||
        (slackClientId.trim() && slackClientSecret.trim())) && (
        <div className="form-group">
          <label>Slack Connection:</label>
          <SlackOAuthConnectionOnly
            clientId={slackClientId}
            clientSecret={slackClientSecret}
          />
        </div>
      )}
    </Modal>
  );
};
