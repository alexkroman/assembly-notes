import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { settingsActions } from './syncActionTypes.js';
import type { SettingsState } from '../../types/redux.js';

const initialState: SettingsState = {
  assemblyaiKey: '',
  slackChannels: '',
  slackInstallation: null,
  summaryPrompt: '',
  prompts: [],
  autoStart: false,
  loading: false,
  error: null,
  hasAssemblyAIKey: false,
  hasSlackConfigured: false,
  dictationStylingEnabled: false,
  dictationStylingPrompt:
    'Please improve the grammar, punctuation, and clarity of this dictated text while maintaining the original meaning and tone.',
  dictationSilenceTimeout: 2000,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(settingsActions.updateSettings, (state, action) => {
        Object.assign(state, action.payload);
        state.loading = false;
        state.error = null;
        if (action.payload.slackInstallation !== undefined) {
          state.hasSlackConfigured = Boolean(action.payload.slackInstallation);
        }
        if (action.payload.assemblyaiKey !== undefined) {
          state.hasAssemblyAIKey = Boolean(
            (action.payload.assemblyaiKey ?? '').trim()
          );
        }
      })
      // Handle async settings actions
      .addMatcher(
        (action: {
          type: unknown;
        }): action is PayloadAction<Partial<SettingsState>> => {
          return (
            typeof action.type === 'string' &&
            action.type.startsWith('settings/') &&
            action.type.endsWith('/fulfilled')
          );
        },
        (state, action) => {
          Object.assign(state, action.payload);
          state.loading = false;
          state.error = null;
          if (action.payload.slackInstallation !== undefined) {
            state.hasSlackConfigured = Boolean(
              action.payload.slackInstallation
            );
          }
          if (action.payload.assemblyaiKey !== undefined) {
            state.hasAssemblyAIKey = Boolean(
              (action.payload.assemblyaiKey ?? '').trim()
            );
          }
        }
      );
  },
});

export default settingsSlice.reducer;
