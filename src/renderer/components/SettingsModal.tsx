import React, { useEffect, useState } from 'react';

import { Modal } from './Modal.js';
import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../constants/dictationPrompts.js';
import type { SettingsModalProps } from '../../types/components.js';
import type { FullSettingsState } from '../../types/redux.js';
import { isEmptyString } from '../../utils/strings.js';
import { useAppDispatch } from '../hooks/redux.js';
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
  const [settings, setSettings] = useState<FullSettingsState>({
    assemblyaiKey: '',
    summaryPrompt: 'Summarize the key points from this meeting transcript:',
    prompts: [],
    autoStart: false,
    dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
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
    if (isEmptyString(settings.assemblyaiKey)) {
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
    value: string | boolean | number
  ) => {
    setSettings((prev: FullSettingsState) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (isEmptyString(settings.assemblyaiKey)) {
      return;
    }
    onClose();
  };

  const handleClose = () => {
    if (isEmptyString(settings.assemblyaiKey)) {
      return;
    }
    onClose();
  };

  const isAssemblyAIKeyMissing = isEmptyString(settings.assemblyaiKey);
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
        bodyTestId="settings-body"
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
        bodyTestId="settings-body"
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
      bodyTestId="settings-body"
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
        <label
          htmlFor="dictationStylingPrompt"
          className="block mb-0.5 text-xs font-medium text-white/[0.85]"
        >
          Dictation Auto-Styling Instructions:
        </label>
        <p className="text-xs text-white/60 mb-1">
          Automatically improve grammar and style of dictated text after silence
        </p>
        <div className="flex flex-col">
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
          {settings.dictationStylingPrompt !==
            DEFAULT_DICTATION_STYLING_PROMPT && (
            <div className="mt-1 flex items-center gap-1">
              <button
                className="px-2 py-0.5 text-[10px] bg-white/[0.06] border border-white/[0.12] rounded-sm text-white/[0.60] cursor-pointer transition-all duration-200 hover:bg-white/[0.09] hover:text-white/[0.85] hover:border-white/[0.18] flex items-center gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  handleInputChange(
                    'dictationStylingPrompt',
                    DEFAULT_DICTATION_STYLING_PROMPT
                  );
                }}
                title="Reset this prompt to its default content"
                type="button"
              >
                <span className="text-xs">↺</span>
                Revert to default
              </button>
            </div>
          )}
        </div>
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
    </Modal>
  );
};
