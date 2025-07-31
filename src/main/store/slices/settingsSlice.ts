import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { container } from 'tsyringe';

import type {
  FullSettingsState,
  PromptTemplate,
  SettingsState,
  SlackInstallation,
} from '../../../types/index.js';
import { DI_TOKENS } from '../../di-tokens.js';
import type { SettingsService } from '../../services/settingsService.js';

// Helper function to safely update computed properties
const updateComputedProperties = (
  state: SettingsState,
  payload: Partial<FullSettingsState> | FullSettingsState
) => {
  if ('assemblyaiKey' in payload) {
    state.hasAssemblyAIKey = Boolean((payload.assemblyaiKey || '').trim());
  }

  // Only update if we have the required fields to compute it
  if (
    'selectedSlackInstallation' in payload ||
    'slackInstallations' in payload
  ) {
    state.hasSlackConfigured = Boolean(
      (payload.selectedSlackInstallation ?? state.selectedSlackInstallation) &&
        (payload.slackInstallations ?? state.slackInstallations).length > 0
    );
  }
};

// Async thunks for settings operations
export const fetchSettings = createAsyncThunk('settings/fetchSettings', () => {
  const settingsService = container.resolve<SettingsService>(
    DI_TOKENS.SettingsService
  );

  return settingsService.getSettings();
});

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  (updates: Partial<FullSettingsState>) => {
    const settingsService = container.resolve<SettingsService>(
      DI_TOKENS.SettingsService
    );
    settingsService.updateSettings(updates);
    return settingsService.getSettings();
  }
);

export const savePrompt = createAsyncThunk(
  'settings/savePrompt',
  (promptSettings: { summaryPrompt: string }) => {
    const settingsService = container.resolve<SettingsService>(
      DI_TOKENS.SettingsService
    );
    settingsService.updateSettings(promptSettings);
    return settingsService.getSettings();
  }
);

export const savePrompts = createAsyncThunk(
  'settings/savePrompts',
  (prompts: PromptTemplate[]) => {
    const settingsService = container.resolve<SettingsService>(
      DI_TOKENS.SettingsService
    );
    settingsService.updateSettings({ prompts });
    return settingsService.getSettings();
  }
);

const initialState: SettingsState = {
  assemblyaiKey: '',
  slackChannels: '',
  // Slack OAuth fields
  slackInstallations: [],
  selectedSlackInstallation: '',
  summaryPrompt: 'Summarize the key points from this meeting transcript:',
  prompts: [],
  autoStart: false,
  loading: false,
  error: null,
  theme: 'dark',
  // Add computed properties for safe trim operations
  hasAssemblyAIKey: false,
  hasSlackConfigured: false,
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
        'slackInstallations' in action.payload ||
        'selectedSlackInstallation' in action.payload
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
    setSlackInstallations: (
      state,
      action: PayloadAction<SlackInstallation[]>
    ) => {
      state.slackInstallations = action.payload;
      updateComputedProperties(state, state);
    },
    setSelectedSlackInstallation: (state, action: PayloadAction<string>) => {
      state.selectedSlackInstallation = action.payload;
      updateComputedProperties(state, state);
    },
    setSummaryPrompt: (state, action: PayloadAction<string>) => {
      state.summaryPrompt = action.payload;
    },
    setAutoStart: (state, action: PayloadAction<boolean>) => {
      state.autoStart = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
        // Update computed properties
        updateComputedProperties(state, action.payload);
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch settings';
      });

    // Save settings
    builder
      .addCase(saveSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
        // Update computed properties
        updateComputedProperties(state, action.payload);
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to save settings';
      });

    // Save prompt
    builder.addCase(savePrompt.fulfilled, (state, action) => {
      Object.assign(state, action.payload);
      // Update computed properties
      updateComputedProperties(state, action.payload);
    });

    // Save prompts
    builder.addCase(savePrompts.fulfilled, (state, action) => {
      Object.assign(state, action.payload);
      // Update computed properties
      updateComputedProperties(state, action.payload);
    });
  },
});

export const {
  updateSettings,
  setAssemblyAIKey,
  setSlackChannels,
  setSlackInstallations,
  setSelectedSlackInstallation,
  setSummaryPrompt,
  setAutoStart,
  setTheme,
  clearError,
} = settingsSlice.actions;

export default settingsSlice.reducer;
