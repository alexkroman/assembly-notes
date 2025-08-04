import {
  createSlice,
  PayloadAction,
  createEntityAdapter,
} from '@reduxjs/toolkit';

import { recordingsActions } from './syncActionTypes.js';
import type { Recording } from '../../types/common.js';

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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
        recordingsActions.setCurrentRecording.type,
        (state, action: PayloadAction<Recording | null>) => {
          state.currentRecording = action.payload;
        }
      )
      .addCase(
        recordingsActions.updateCurrentRecordingSummary.type,
        (state, action: PayloadAction<string>) => {
          if (state.currentRecording) {
            state.currentRecording.summary = action.payload;
          }
        }
      );
  },
});

export default recordingsSlice.reducer;
