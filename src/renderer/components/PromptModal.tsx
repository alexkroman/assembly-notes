import React, { useState, useEffect } from 'react';

import { DEFAULT_PROMPTS } from '../../constants/defaultPrompts.js';
import type { PromptModalProps } from '../../types/components.js';
import type { PromptTemplate } from '../../types/index.js';
import { useAppDispatch } from '../hooks/redux';
import { setStatus } from '../store';

export const PromptModal: React.FC<PromptModalProps> = ({ onClose }) => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dispatch = useAppDispatch();

  useEffect(() => {
    void loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      const loadedPrompts =
        (settings as { prompts?: PromptTemplate[] }).prompts ?? [];

      // Ensure we always have exactly 5 prompts
      const finalPrompts: PromptTemplate[] = [];
      for (let i = 0; i < 5; i++) {
        const prompt = loadedPrompts[i] ?? DEFAULT_PROMPTS[i];
        if (prompt) {
          finalPrompts.push(prompt);
        }
      }

      setPrompts(finalPrompts);
      setSelectedIndex(
        (settings as { selectedPromptIndex?: number }).selectedPromptIndex ?? 0
      );
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const handleSave = async () => {
    try {
      await window.electronAPI.savePrompts(prompts);
      dispatch(setStatus('Prompts saved successfully'));
      window.dispatchEvent(new CustomEvent('prompts-updated'));
      onClose();
    } catch (error) {
      console.error('Error saving prompts:', error);
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

  return (
    <div className="modal-overlay" data-testid="prompt-modal">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Manage Prompts</h2>
          <button
            className="modal-close"
            data-testid="close-modal-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
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
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              void handleSave();
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
