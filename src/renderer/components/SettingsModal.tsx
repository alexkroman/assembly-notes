import React, { useEffect, useState } from 'react';

import { Modal } from './Modal.js';
import { SlackOAuthConnectionOnly } from './SlackOAuthConnectionOnly.js';
import type { SettingsModalProps } from '../../types/components.js';
import type { FullSettingsState } from '../../types/redux.js';
import { useAppDispatch } from '../hooks/redux.js';
import { setStatus } from '../store';
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from '../store/api/apiSlice.js';
import '../../types/global.d.ts';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    data: fetchedSettings,
    isLoading,
    error,
  } = useGetSettingsQuery(undefined);
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const [settings, setSettings] = useState<FullSettingsState>({
    assemblyaiKey: '',
    slackChannels: '',
    slackInstallation: null,
    summaryPrompt: 'Summarize the key points from this meeting transcript:',
    prompts: [],
    autoStart: false,
  });
  const [slackClientId, setSlackClientId] = useState('');
  const [slackClientSecret, setSlackClientSecret] = useState('');
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Update local state when settings are fetched
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

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
      await updateSettings(settings).unwrap();
      dispatch(setStatus('Settings saved successfully'));
      onClose();
    } catch (error) {
      window.logger.error('Error saving settings:', error);
      dispatch(setStatus('Error saving settings'));
    }
  };

  const handleInputChange = (
    field: keyof FullSettingsState,
    value: string | boolean
  ) => {
    setSettings((prev: FullSettingsState) => ({ ...prev, [field]: value }));
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
  const isDisabled = isAssemblyAIKeyMissing || isSaving;

  const footer = (
    <>
      <button
        className={`px-4 py-2 bg-white/[0.09] border border-white/[0.18] text-white/[0.85] rounded-sm cursor-pointer font-medium transition-all duration-200 hover:bg-white/[0.12] hover:text-white ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        data-testid="cancel-settings-btn"
        onClick={handleCancel}
        disabled={isDisabled}
      >
        Cancel
      </button>
      <button
        className={`px-3 py-1.5 bg-[#28a745]/20 border border-[#28a745]/50 text-[#28a745] rounded-sm cursor-pointer font-medium transition-all duration-200 hover:bg-[#28a745]/30 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        data-testid="save-settings-btn"
        onClick={() => {
          void handleSave();
        }}
        disabled={isDisabled}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </>
  );

  if (isLoading) {
    return (
      <Modal
        title="Settings"
        onClose={handleClose}
        footer={null}
        size="large"
        testId="settings-modal"
        bodyTestId="slack-settings"
        closeDisabled={true}
      >
        <div>Loading settings...</div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        title="Settings"
        onClose={handleClose}
        footer={null}
        size="large"
        testId="settings-modal"
        bodyTestId="slack-settings"
        closeDisabled={false}
      >
        <div>Error loading settings. Please try again.</div>
      </Modal>
    );
  }

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
        <label
          htmlFor="assemblyaiKey"
          className="block mb-1 text-sm font-medium text-white/[0.85]"
        >
          AssemblyAI API Key (required):
        </label>
        <input
          type="password"
          id="assemblyaiKey"
          data-testid="assemblyai-key-input"
          value={settings.assemblyaiKey}
          onChange={(e) => {
            handleInputChange('assemblyaiKey', e.target.value);
          }}
          placeholder="Enter your AssemblyAI API key"
          className={`w-full p-2 bg-transparent border border-white/[0.12] rounded-sm text-white text-base outline-none transition-all duration-200 box-border focus:border-white/[0.45] focus:bg-transparent ${isAssemblyAIKeyMissing ? 'border-[#dc3545]' : ''}`}
        />
      </div>

      {!settings.slackInstallation && (
        <div className="form-group">
          <label className="block mb-1 text-sm font-medium text-text-primary">
            Slack Credentials (optional):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="slackClientId"
              data-testid="slack-client-id-input"
              value={slackClientId}
              onChange={(e) => {
                setSlackClientId(e.target.value);
              }}
              placeholder="Client ID"
              className="w-full p-2 bg-transparent border border-white/[0.12] rounded-sm text-white text-base outline-none transition-all duration-200 box-border focus:border-white/[0.45] focus:bg-transparent flex-1"
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
              className="w-full p-2 bg-transparent border border-white/[0.12] rounded-sm text-white text-base outline-none transition-all duration-200 box-border focus:border-white/[0.45] focus:bg-transparent flex-1"
            />
          </div>
        </div>
      )}

      {(Boolean(settings.slackInstallation) ||
        (slackClientId.trim() && slackClientSecret.trim())) && (
        <div className="form-group">
          <label className="block mb-1 text-sm font-medium text-text-primary">
            Slack Connection:
          </label>
          <SlackOAuthConnectionOnly
            clientId={slackClientId}
            clientSecret={slackClientSecret}
          />
        </div>
      )}
    </Modal>
  );
};
