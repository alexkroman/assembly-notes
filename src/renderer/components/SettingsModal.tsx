import React, { useEffect, useState } from 'react';

import { Modal } from './Modal.js';
import { SlackOAuthConnectionOnly } from './SlackOAuthConnectionOnly.js';
import type { SettingsModalProps } from '../../types/components.js';
import type { FullSettingsState } from '../../types/redux.js';
import { useAppDispatch, useAppSelector } from '../hooks/redux.js';
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from '../slices/apiSlice.js';
import { setStatus } from '../store';
import '../../types/global.d.ts';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    data: fetchedSettings,
    isLoading,
    error,
  } = useGetSettingsQuery(undefined);
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const reduxSlackInstallation = useAppSelector(
    (state) => state.settings.slackInstallation
  );
  const [settings, setSettings] = useState<FullSettingsState>({
    assemblyaiKey: '',
    slackChannels: '',
    slackInstallation: null,
    summaryPrompt: 'Summarize the key points from this meeting transcript:',
    prompts: [],
    autoStart: false,
    dictationStylingEnabled: false,
    dictationStylingPrompt:
      'Rewrite this dictated text in my personal writing style: conversational, direct, and well-structured. Fix grammar and add proper formatting while keeping the original meaning.',
    dictationSilenceTimeout: 2000,
  });
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Update local state when settings are fetched
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  useEffect(() => {
    // Sync slackInstallation from Redux state when OAuth completes
    setSettings((prev) => ({
      ...prev,
      slackInstallation: reduxSlackInstallation,
    }));
  }, [reduxSlackInstallation]);

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
      // Ensure we're saving the current slackInstallation from Redux state
      const settingsToSave = {
        ...settings,
        slackInstallation: reduxSlackInstallation ?? settings.slackInstallation,
      };
      await updateSettings(settingsToSave).unwrap();
      dispatch(setStatus('Settings saved successfully'));
      onClose();
    } catch (error) {
      window.logger.error('Error saving settings:', error);
      dispatch(setStatus('Error saving settings'));
    }
  };

  const handleInputChange = (
    field: keyof FullSettingsState,
    value: string | boolean | number
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
        className={`btn-secondary ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        data-testid="cancel-settings-btn"
        onClick={handleCancel}
        disabled={isDisabled}
      >
        Cancel
      </button>
      <button
        className={`btn-primary ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          className="block mb-0.5 text-xs font-medium text-white/[0.85]"
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
          className={`form-input ${isAssemblyAIKeyMissing ? 'border-[#dc3545]' : ''}`}
        />
      </div>

      <div className="form-group">
        <label className="flex items-center gap-2 text-xs font-medium text-white/[0.85]">
          <input
            type="checkbox"
            checked={settings.dictationStylingEnabled}
            onChange={(e) => {
              handleInputChange('dictationStylingEnabled', e.target.checked);
            }}
            className="rounded"
            data-testid="dictation-styling-enabled"
          />
          Enable Dictation Auto-Styling
        </label>
        <p className="text-xs text-white/60 mt-1">
          Automatically improve grammar and style of dictated text after 2+
          seconds of silence
        </p>
      </div>

      {settings.dictationStylingEnabled && (
        <>
          <div className="form-group">
            <label
              htmlFor="dictationStylingPrompt"
              className="block mb-0.5 text-xs font-medium text-white/[0.85]"
            >
              Styling Instructions:
            </label>
            <textarea
              id="dictationStylingPrompt"
              value={settings.dictationStylingPrompt}
              onChange={(e) => {
                handleInputChange('dictationStylingPrompt', e.target.value);
              }}
              placeholder="Enter instructions for how to style your dictated text..."
              className="form-input h-20"
              data-testid="dictation-styling-prompt"
            />
          </div>

          <div className="form-group">
            <label
              htmlFor="dictationSilenceTimeout"
              className="block mb-0.5 text-xs font-medium text-white/[0.85]"
            >
              Silence Timeout (milliseconds):
            </label>
            <input
              type="number"
              id="dictationSilenceTimeout"
              value={settings.dictationSilenceTimeout}
              onChange={(e) => {
                handleInputChange(
                  'dictationSilenceTimeout',
                  parseInt(e.target.value) || 2000
                );
              }}
              min="1000"
              max="10000"
              step="500"
              className="form-input"
              data-testid="dictation-silence-timeout"
            />
            <p className="text-xs text-white/60 mt-1">
              How long to wait after silence before styling text (recommended:
              2000-3000ms)
            </p>
          </div>
        </>
      )}

      <div className="form-group">
        <label className="block mb-0.5 text-xs font-medium text-white/[0.85]">
          Slack Connection (optional):
        </label>
        <SlackOAuthConnectionOnly />
      </div>
    </Modal>
  );
};
