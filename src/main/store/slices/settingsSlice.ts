import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { DEFAULT_DICTATION_STYLING_PROMPT } from '../../../constants/prompts.js';
import type { FullSettingsState, SettingsState } from '../../../types/index.js';
import { isNonEmptyString } from '../../../utils/strings.js';

// Helper function to safely update computed properties
const updateComputedProperties = (
  state: SettingsState,
  payload: Partial<FullSettingsState> | FullSettingsState
) => {
  if ('assemblyaiKey' in payload) {
    state.hasAssemblyAIKey = isNonEmptyString(payload.assemblyaiKey);
  }
};

const initialState: SettingsState = {
  assemblyaiKey: '',
  summaryPrompt: 'Summarize the key points from this meeting transcript:',
  prompts: [],
  autoStart: false,
  loading: false,
  error: null,
  // Computed properties for safe trim operations
  hasAssemblyAIKey: false,
  // Dictation styling settings
  dictationStylingPrompt: DEFAULT_DICTATION_STYLING_PROMPT,
  // Audio processing settings
  microphoneGain: 1.0, // Default microphone volume (full volume)
  systemAudioGain: 0.7, // Default system audio volume (reduced to prevent overpowering)
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      const newState = { ...state, ...action.payload };
      // Update computed properties if we have the required fields
      if ('assemblyaiKey' in action.payload) {
        updateComputedProperties(newState, newState);
      }
      return newState;
    },
    setAssemblyAIKey: (state, action: PayloadAction<string>) => {
      state.assemblyaiKey = action.payload;
      updateComputedProperties(state, state);
    },
    setSummaryPrompt: (state, action: PayloadAction<string>) => {
      state.summaryPrompt = action.payload;
    },
    setAutoStart: (state, action: PayloadAction<boolean>) => {
      state.autoStart = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  updateSettings,
  setAssemblyAIKey,
  setSummaryPrompt,
  setAutoStart,
  clearError,
} = settingsSlice.actions;

export default settingsSlice.reducer;
