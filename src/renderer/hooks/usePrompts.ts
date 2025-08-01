import { useState } from 'react';

import { useAppSelector } from './redux.js';
import { DEFAULT_PROMPTS } from '../../constants/defaultPrompts.js';

export const usePrompts = () => {
  const settings = useAppSelector((state) => state.settings);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);

  const prompts = settings.prompts.length ? settings.prompts : DEFAULT_PROMPTS;

  const handlePromptChange = (index: number) => {
    setSelectedPromptIndex(index);
  };

  return {
    prompts,
    selectedPromptIndex,
    handlePromptChange,
  };
};
