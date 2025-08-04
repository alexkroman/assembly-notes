import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { recordingsActions } from './syncActionTypes.js';
import type { Recording } from '../../types/common.js';
import type { RecordingsState } from '../../types/redux.js';

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
