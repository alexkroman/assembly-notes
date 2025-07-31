import React, { useState, useEffect } from 'react';

import { Modal } from './Modal.js';
import { DEFAULT_PROMPTS } from '../../constants/prompts.js';
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

      // always 5 slots
      const finalPrompts: PromptTemplate[] = Array.from({ length: 5 }, (_, i) =>
        loadedPrompts[i] ?? DEFAULT_PROMPTS[i],
      ).filter(Boolean) as PromptTemplate[];

      setPrompts(finalPrompts);
      setSelectedIndex(
        (settings as { selectedPromptIndex?: number }).selectedPromptIndex ?? 0,
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
    value: string,
  ) => {
    setPrompts((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, [field]: value } as PromptTemplate;
      return next;
    });
  };

  const handleRevertToDefault = () => {
    const defaultPrompt = DEFAULT_PROMPTS[selectedIndex];
    if (defaultPrompt) {
      setPrompts((prev) => {
        const next = [...prev];
        next[selectedIndex] = { ...defaultPrompt };
        return next;
      });
    }
  };

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
        Save Changes
      </button>
    </>
  );

  return (
    <Modal
      title="Manage Prompts"
      onClose={onClose}
      size="large"
      footer={footer}
      overlayTestId="prompt-modal"
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
                    handleUpdatePrompt(selectedIndex, 'content', e.target.value);
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
                    style={{ fontSize: '0.7em', color: '#888', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}
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
