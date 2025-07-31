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
  const dispatch = useAppDispatch();

  useEffect(() => {
    setSettings((prevSettings) => ({
      ...reduxSettings,
      // Preserve local assemblyaiKey if it's been modified but not saved
      assemblyaiKey:
        prevSettings.assemblyaiKey !== reduxSettings.assemblyaiKey &&
        prevSettings.assemblyaiKey.trim() !== ''
          ? prevSettings.assemblyaiKey
          : reduxSettings.assemblyaiKey,
    }));
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

      <div className="form-group">
        <label>Slack Integration (optional):</label>
        <SlackOAuthConnectionOnly />
      </div>
    </Modal>
  );
};
