import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { Recording, RecordingsState } from '../../../types/index.js';

const initialState: RecordingsState = {
  recordings: [],
  currentRecording: null,
  searchResults: [],
  searchQuery: '',
  loading: {
    fetchAll: false,
    search: false,
    fetchOne: false,
    update: false,
    delete: false,
  },
  error: null,
};

const recordingsSlice = createSlice({
  name: 'recordings',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentRecording: (state, action: PayloadAction<Recording | null>) => {
      state.currentRecording = action.payload;
    },
    // State-only updates (no database writes) - used for syncing from external sources like AI
    updateCurrentRecordingSummary: (state, action: PayloadAction<string>) => {
      if (state.currentRecording) {
        state.currentRecording.summary = action.payload;
        state.currentRecording.updated_at = Date.now();
      }
    },
  },
});

export const {
  setSearchQuery,
  clearError,
  setCurrentRecording,
  updateCurrentRecordingSummary,
} = recordingsSlice.actions;

export default recordingsSlice.reducer;
