import { useAppSelector } from './redux.js';
import { DEFAULT_PROMPTS } from '../../constants/defaultPrompts.js';
export const usePrompts = () => {
  const settings = useAppSelector((state) => state.settings);

  const prompts = settings.prompts.length ? settings.prompts : DEFAULT_PROMPTS;
  const selectedPromptIndex = settings.selectedPromptIndex;

  const handlePromptChange = async (index: number) => {
    try {
      await window.electronAPI.selectPrompt(index);
    } catch (error) {
      console.error('Error saving selected prompt:', error);
    }
  };

  return {
    prompts,
    selectedPromptIndex,
    handlePromptChange,
  };
};
