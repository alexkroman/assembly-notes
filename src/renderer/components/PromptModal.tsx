import React, { useState, useEffect } from 'react';

import { Modal } from './Modal.js';
import { DEFAULT_PROMPTS } from '../../constants/defaultPrompts.js';
import type { PromptModalProps } from '../../types/components.js';
import type { PromptTemplate } from '../../types/index.js';
import { useAppDispatch } from '../hooks/redux';
import {
  useGetSettingsQuery,
  useUpdatePromptsMutation,
} from '../slices/apiSlice.js';
import { setStatus } from '../store';

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

  // Check if prompt is modified from default
  const isPromptModified = (index: number) => {
    const defaultPrompt = DEFAULT_PROMPTS[index];
    const currentPrompt = prompts[index];
    if (!defaultPrompt || !currentPrompt) return false;
    return (
      currentPrompt.name !== defaultPrompt.name ||
      currentPrompt.content !== defaultPrompt.content
    );
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
        {isSaving ? 'Saving...' : 'Save'}
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
      <div className="flex flex-col gap-0.5 h-full">
        <div className="flex gap-0.25 mb-0.5">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              className={`px-1.25 py-0.25 text-xs font-medium rounded-sm cursor-pointer transition-all duration-150 ease-in-out min-w-[22px] text-center ${index === selectedIndex ? 'bg-[#28a745]/20 border-[#28a745]/50 text-white hover:bg-[#28a745]/30' : 'bg-white/[0.06] border border-white/[0.12] text-white/[0.70] hover:bg-white/[0.09] hover:text-white/[0.85]'}`}
              onClick={() => {
                setSelectedIndex(index);
              }}
              title={prompt.name}
            >
              {index + 1}
              {isPromptModified(index) && (
                <span className="text-[8px] ml-0.5">•</span>
              )}
            </button>
          ))}
        </div>

        {prompts[selectedIndex] && (
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-white/[0.85]">
                Name:
              </span>
              <input
                type="text"
                className="bg-white/[0.05] border border-white/[0.18] rounded-sm px-1.25 py-0.5 text-xs text-white focus:outline-none focus:border-[#28a745]/50 focus:bg-white/[0.12]"
                value={prompts[selectedIndex].name}
                onChange={(e) => {
                  handleUpdatePrompt(selectedIndex, 'name', e.target.value);
                }}
                placeholder="Prompt name"
              />
            </div>

            <div className="flex flex-col gap-0.5 flex-1">
              <span className="text-xs font-medium text-white/[0.85]">
                Content:
              </span>
              <div className="flex flex-col flex-1">
                <textarea
                  className="bg-white/[0.05] border border-white/[0.18] rounded-sm p-1 text-xs text-white resize-none min-h-[35px] font-mono leading-tight focus:outline-none focus:border-[#28a745]/50 focus:bg-white/[0.12] flex-1"
                  value={prompts[selectedIndex].content}
                  onChange={(e) => {
                    handleUpdatePrompt(
                      selectedIndex,
                      'content',
                      e.target.value
                    );
                  }}
                  placeholder="Enter prompt content..."
                  rows={3}
                  style={{ width: '100%' }}
                />
                {DEFAULT_PROMPTS[selectedIndex] &&
                  (prompts[selectedIndex].name !==
                    DEFAULT_PROMPTS[selectedIndex].name ||
                    prompts[selectedIndex].content !==
                      DEFAULT_PROMPTS[selectedIndex].content) && (
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        className="px-2 py-0.5 text-[10px] bg-white/[0.06] border border-white/[0.12] rounded-sm text-white/[0.60] cursor-pointer transition-all duration-200 hover:bg-white/[0.09] hover:text-white/[0.85] hover:border-white/[0.18] flex items-center gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRevertToDefault();
                        }}
                        title="Reset this prompt to its default name and content"
                      >
                        <span className="text-xs">↺</span>
                        Reset to default
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
