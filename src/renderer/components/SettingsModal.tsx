import React, { useEffect, useState } from 'react';

import { Modal } from './Modal.js';
import type { SettingsModalProps } from '../../types/components.js';
import type { SettingsState } from '../../types/redux.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux.js';
import { setStatus } from '../store';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const reduxSettings = useAppSelector((state) => state.settings);
  const [settings, setSettings] = useState<SettingsState>(reduxSettings);
  const dispatch = useAppDispatch();

  useEffect(() => {
    setSettings(reduxSettings);
  }, [reduxSettings]);

  const handleSave = async () => {
    if (!(settings.assemblyaiKey || '').trim()) return;
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

  const isAssemblyAIKeyMissing = !(settings.assemblyaiKey || '').trim();

  const footer = (
    <>
      <button
        className={`btn-secondary ${isAssemblyAIKeyMissing ? 'disabled' : ''}`}
        data-testid="cancel-settings-btn"
        onClick={onClose}
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
      onClose={onClose}
      footer={footer}
      disableClose={isAssemblyAIKeyMissing}
      overlayTestId="settings-modal"
    >
      <div data-testid="slack-settings">
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

        <div className="form-group">
          <label htmlFor="slackBotToken">Slack Bot Token (optional):</label>
          <input
            type="password"
            id="slackBotToken"
            data-testid="slack-token-input"
            value={settings.slackBotToken}
            onChange={(e) => {
              handleInputChange('slackBotToken', e.target.value);
            }}
            placeholder="xoxb-your-slack-bot-token"
          />
        </div>
      </div>
    </Modal>
  );
};
