import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { container } from 'tsyringe';

import type {
  FullSettingsState,
  PromptTemplate,
  SettingsState,
} from '../../../types/index.js';
import type { DatabaseService } from '../../database.js';
import { DI_TOKENS } from '../../di-tokens.js';
import type { SettingsService } from '../../services/settingsService.js';

// Helper function to safely update computed properties
const updateComputedProperties = (
  state: SettingsState,
  payload: FullSettingsState
) => {
  state.hasAssemblyAIKey = Boolean((payload.assemblyaiKey || '').trim());
  state.hasSlackBotToken = Boolean((payload.slackBotToken || '').trim());
  state.hasSlackChannels = Boolean((payload.slackChannels || '').trim());
};

// Async thunks for settings operations
export const fetchSettings = createAsyncThunk('settings/fetchSettings', () => {
  const databaseService = container.resolve<DatabaseService>(
    DI_TOKENS.DatabaseService
  );

  const settings = databaseService.getSettings();

  return {
    assemblyaiKey: settings.assemblyaiKey,
    slackBotToken: settings.slackBotToken,
    slackChannels: settings.slackChannels,
    selectedSlackChannel: settings.selectedSlackChannel,
    summaryPrompt:
      settings.summaryPrompt ||
      'Summarize the key points from this meeting transcript:',
    selectedPromptIndex: settings.selectedPromptIndex,
    prompts: settings.prompts,
    autoStart: settings.autoStart,
  };
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

export const selectPrompt = createAsyncThunk(
  'settings/selectPrompt',
  (index: number) => {
    const settingsService = container.resolve<SettingsService>(
      DI_TOKENS.SettingsService
    );
    settingsService.updateSettings({ selectedPromptIndex: index });
    return settingsService.getSettings();
  }
);

export const saveSelectedChannel = createAsyncThunk(
  'settings/saveSelectedChannel',
  (channel: string) => {
    const settingsService = container.resolve<SettingsService>(
      DI_TOKENS.SettingsService
    );
    settingsService.updateSettings({ selectedSlackChannel: channel });
    return settingsService.getSettings();
  }
);

const initialState: SettingsState = {
  assemblyaiKey: '',
  slackBotToken: '',
  slackChannels: '',
  selectedSlackChannel: '',
  summaryPrompt: 'Summarize the key points from this meeting transcript:',
  selectedPromptIndex: 0,
  prompts: [],
  autoStart: false,
  loading: false,
  error: null,
  theme: 'dark',
  // Add computed properties for safe trim operations
  hasAssemblyAIKey: false,
  hasSlackBotToken: false,
  hasSlackChannels: false,
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
        'slackBotToken' in action.payload ||
        'slackChannels' in action.payload
      ) {
        updateComputedProperties(newState, newState);
      }
      return newState;
    },
    setAssemblyAIKey: (state, action: PayloadAction<string>) => {
      state.assemblyaiKey = action.payload;
      updateComputedProperties(state, state);
    },
    setSlackBotToken: (state, action: PayloadAction<string>) => {
      state.slackBotToken = action.payload;
      updateComputedProperties(state, state);
    },
    setSlackChannels: (state, action: PayloadAction<string>) => {
      state.slackChannels = action.payload;
      updateComputedProperties(state, state);
    },
    setSelectedSlackChannel: (state, action: PayloadAction<string>) => {
      state.selectedSlackChannel = action.payload;
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

    // Select prompt
    builder.addCase(selectPrompt.fulfilled, (state, action) => {
      Object.assign(state, action.payload);
      // Update computed properties
      updateComputedProperties(state, action.payload);
    });

    // Save selected channel
    builder.addCase(saveSelectedChannel.fulfilled, (state, action) => {
      Object.assign(state, action.payload);
      // Update computed properties
      updateComputedProperties(state, action.payload);
    });
  },
});

export const {
  updateSettings,
  setAssemblyAIKey,
  setSlackBotToken,
  setSlackChannels,
  setSelectedSlackChannel,
  setSummaryPrompt,
  setAutoStart,
  setTheme,
  clearError,
} = settingsSlice.actions;

export default settingsSlice.reducer;
