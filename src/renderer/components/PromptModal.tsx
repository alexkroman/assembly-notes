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
      <div className="flex flex-col gap-1 h-full">
        <div className="flex gap-0.25 mb-1">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              className={`px-1.5 py-0.5 text-xs font-medium bg-white/[0.06] border border-white/[0.12] rounded-sm text-white/[0.70] cursor-pointer transition-all duration-150 ease-in-out min-w-[24px] text-center hover:bg-white/[0.09] hover:text-white/[0.85] ${index === selectedIndex ? 'bg-[#28a745]/20 border-[#28a745]/50 text-white' : ''}`}
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
          <div className="flex flex-col gap-1 flex-1">
            <div className="grid grid-cols-[50px_1fr] gap-1.5 items-start">
              <span className="text-xs font-medium text-white/[0.85] pt-0.75">
                Name:
              </span>
              <input
                type="text"
                className="bg-white/[0.05] border border-white/[0.18] rounded-sm px-1.25 py-0.75 text-xs text-white focus:outline-none focus:border-[#28a745]/50 focus:bg-white/[0.12]"
                value={prompts[selectedIndex].name}
                onChange={(e) => {
                  handleUpdatePrompt(selectedIndex, 'name', e.target.value);
                }}
                placeholder="Prompt name"
              />
            </div>

            <div className="grid grid-cols-[50px_1fr] gap-1.5 items-start">
              <span className="text-xs font-medium text-white/[0.85] pt-0.75">
                Content:
              </span>
              <div className="flex flex-col">
                <textarea
                  className="bg-white/[0.05] border border-white/[0.18] rounded-sm p-1 text-xs text-white resize-none min-h-[80px] font-mono leading-tight focus:outline-none focus:border-[#28a745]/50 focus:bg-white/[0.12]"
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
                  style={{ width: '100%' }}
                />
                <div className="mt-1">
                  <a
                    href="#"
                    className="text-xs text-white/[0.60] no-underline inline-block hover:text-white/[0.70] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRevertToDefault();
                    }}
                    title="Revert to the default name and prompt for this slot"
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
