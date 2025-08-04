import {
  createSlice,
  PayloadAction,
  createEntityAdapter,
} from '@reduxjs/toolkit';

import type { Recording } from '../../../types/index.js';
import type { RootState } from '../store.js';

const recordingsAdapter = createEntityAdapter<Recording>({
  sortComparer: (a, b) => b.created_at - a.created_at,
});

type RecordingsState = ReturnType<typeof recordingsAdapter.getInitialState> & {
  currentRecording: Recording | null;
  searchResults: Recording[];
  searchQuery: string;
  loading: {
    fetchAll: boolean;
    search: boolean;
    fetchOne: boolean;
    update: boolean;
    delete: boolean;
  };
  error: string | null;
};

const initialState: RecordingsState = recordingsAdapter.getInitialState({
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
});

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

export const {
  selectAll: selectAllRecordings,
  selectById: selectRecordingById,
  selectIds: selectRecordingIds,
} = recordingsAdapter.getSelectors((state: RootState) => state.recordings);

export default recordingsSlice.reducer;
