import React, { useState, useEffect } from 'react';

import { Modal } from './Modal.js';
import { DEFAULT_PROMPTS } from '../../constants/defaultPrompts.js';
import type { PromptModalProps } from '../../types/components.js';
import type { PromptTemplate } from '../../types/index.js';
import { useAppDispatch } from '../hooks/redux';
import { setStatus } from '../store';
import {
  useGetSettingsQuery,
  useUpdatePromptsMutation,
} from '../store/api/apiSlice.js';

export const PromptModal: React.FC<PromptModalProps> = ({ onClose }) => {
  const { data: settings, isLoading, error } = useGetSettingsQuery(undefined);
  const [updatePrompts, { isLoading: isSaving }] = useUpdatePromptsMutation();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (settings) {
      const loadedPrompts = settings.prompts;

      // Ensure we always have exactly 5 prompts
      const finalPrompts: PromptTemplate[] = [];
      for (let i = 0; i < 5; i++) {
        const prompt = loadedPrompts[i] ?? DEFAULT_PROMPTS[i];
        if (prompt) {
          finalPrompts.push(prompt);
        }
      }
      setPrompts(finalPrompts);
      setSelectedIndex(0);
    } else if (error) {
      // Fallback to default prompts if loading fails
      setPrompts(DEFAULT_PROMPTS);
    }
  }, [settings, error]);

  const handleSave = async () => {
    try {
      await updatePrompts(prompts).unwrap();
      dispatch(setStatus('Prompts saved successfully'));
      window.dispatchEvent(new CustomEvent('prompts-updated'));
      onClose();
    } catch (error) {
      window.logger.error('Error saving prompts:', error);
      dispatch(setStatus('Error saving prompts'));
    }
  };

  const handleUpdatePrompt = (
    index: number,
    field: 'name' | 'content',
    value: string
  ) => {
    const newPrompts = [...prompts];
    const currentPrompt = newPrompts[index];
    if (currentPrompt) {
      newPrompts[index] = {
        name: currentPrompt.name,
        content: currentPrompt.content,
        [field]: value,
      };
      setPrompts(newPrompts);
    }
  };

  const handleRevertToDefault = () => {
    const defaultPrompt = DEFAULT_PROMPTS[selectedIndex];
    if (defaultPrompt) {
      const newPrompts = [...prompts];
      newPrompts[selectedIndex] = {
        name: defaultPrompt.name,
        content: defaultPrompt.content,
      };
      setPrompts(newPrompts);
    }
  };

  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose} disabled={isSaving}>
        Cancel
      </button>
      <button
        className="btn-primary"
        onClick={() => {
          void handleSave();
        }}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </>
  );

  if (isLoading) {
    return (
      <Modal
        title="Manage Prompts"
        onClose={onClose}
        footer={null}
        size="large"
        testId="prompt-modal"
      >
        <div>Loading prompts...</div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Manage Prompts"
      onClose={onClose}
      footer={footer}
      size="large"
      testId="prompt-modal"
    >
      <div className="prompt-editor-dense">
        <div className="prompt-tabs">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              className={`prompt-tab ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => {
                setSelectedIndex(index);
              }}
              title={prompt.name}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {prompts[selectedIndex] && (
          <div className="prompt-content-dense">
            <div className="prompt-header-row">
              <span className="prompt-label">Name:</span>
              <input
                type="text"
                className="prompt-name-input-dense"
                value={prompts[selectedIndex].name}
                onChange={(e) => {
                  handleUpdatePrompt(selectedIndex, 'name', e.target.value);
                }}
                placeholder="Prompt name"
              />
            </div>

            <div className="prompt-content-row">
              <span className="prompt-label">Content:</span>
              <div className="prompt-content-wrapper">
                <textarea
                  className="prompt-content-input-dense"
                  value={prompts[selectedIndex].content}
                  onChange={(e) => {
                    handleUpdatePrompt(
                      selectedIndex,
                      'content',
                      e.target.value
                    );
                  }}
                  placeholder="Enter prompt content..."
                  rows={9}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <div className="revert-link-wrapper">
                  <a
                    href="#"
                    className="revert-to-default-link"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRevertToDefault();
                    }}
                    title="Revert to the default name and prompt for this slot"
                    style={{
                      fontSize: '0.7em',
                      color: '#888',
                      textDecoration: 'none',
                      marginTop: '4px',
                      display: 'inline-block',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#666';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#888';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Revert to default
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
