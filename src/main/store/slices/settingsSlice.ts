import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import type {
  FullSettingsState,
  SettingsState,
  SlackInstallation,
} from '../../../types/index.js';

// Helper function to safely update computed properties
const updateComputedProperties = (
  state: SettingsState,
  payload: Partial<FullSettingsState> | FullSettingsState
) => {
  if ('assemblyaiKey' in payload) {
    state.hasAssemblyAIKey = Boolean((payload.assemblyaiKey || '').trim());
  }
  if ('slackInstallation' in payload) {
    state.hasSlackConfigured = Boolean(payload.slackInstallation);
  }
};

const initialState: SettingsState = {
  assemblyaiKey: '',
  slackChannels: '',
  // Slack OAuth fields
  slackInstallation: null,
  summaryPrompt: 'Summarize the key points from this meeting transcript:',
  prompts: [],
  autoStart: false,
  loading: false,
  error: null,
  // Add computed properties for safe trim operations
  hasAssemblyAIKey: false,
  hasSlackConfigured: false,
  // Dictation styling settings
  dictationStylingEnabled: false,
  dictationStylingPrompt:
    'Rewrite this dictated text in my personal writing style: conversational, direct, and well-structured. Fix grammar and add proper formatting while keeping the original meaning.',
  dictationSilenceTimeout: 2000,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      const newState = { ...state, ...action.payload };
      // Update computed properties if we have the required fields
      if (
        'assemblyaiKey' in action.payload ||
        'slackInstallation' in action.payload
      ) {
        updateComputedProperties(newState, newState);
      }
      return newState;
    },
    setAssemblyAIKey: (state, action: PayloadAction<string>) => {
      state.assemblyaiKey = action.payload;
      updateComputedProperties(state, state);
    },
    setSlackChannels: (state, action: PayloadAction<string>) => {
      state.slackChannels = action.payload;
    },
    setSlackInstallation: (
      state,
      action: PayloadAction<SlackInstallation | null>
    ) => {
      state.slackInstallation = action.payload;
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
  setSlackChannels,
  setSlackInstallation,
  setSummaryPrompt,
  setAutoStart,
  clearError,
} = settingsSlice.actions;

export default settingsSlice.reducer;
