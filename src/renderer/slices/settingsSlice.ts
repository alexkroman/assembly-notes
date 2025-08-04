import { createSlice } from '@reduxjs/toolkit';

import type { SettingsAction } from './syncActionTypes.js';
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
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // This matcher handles all settings update actions efficiently
    builder.addMatcher(
      (action): action is SettingsAction => {
        const actionType = (action as { type?: string }).type;
        return (
          typeof actionType === 'string' &&
          actionType.startsWith('settings/') &&
          (actionType.endsWith('/fulfilled') ||
            actionType.endsWith('/updateSettings'))
        );
      },
      (state, action) => {
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
      }
    );
  },
});

export default settingsSlice.reducer;
