import { createSlice } from '@reduxjs/toolkit';

import { recordingActions } from './syncActionTypes.js';
import type { RecordingState } from '../../types/redux.js';

const initialState: RecordingState = {
  status: 'idle',
  recordingId: null,
  startTime: null,
  error: null,
  connectionStatus: { microphone: false, system: false },
};

const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {}, // No local reducers needed if all actions come from main process
  extraReducers: (builder) => {
    builder
      .addCase(recordingActions.startPending, (state) => {
        state.status = 'starting';
        state.error = null;
      })
      .addCase(recordingActions.startFulfilled, (state) => {
        state.status = 'recording';
      })
      .addCase(recordingActions.startRejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload;
      })
      .addCase(recordingActions.stopPending, (state) => {
        state.status = 'stopping';
      })
      .addCase(recordingActions.stopFulfilled, (state) => {
        state.status = 'idle';
        state.connectionStatus = { microphone: false, system: false };
      })
      .addCase(recordingActions.setError, (state, action) => {
        state.error = action.payload;
      })
      .addCase(recordingActions.updateConnectionStatus, (state, action) => {
        state.connectionStatus[action.payload.stream] =
          action.payload.connected;
      });
  },
});

export default recordingSlice.reducer;
