import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
      .addCase('recording/start/pending', (state) => {
        state.status = 'starting';
        state.error = null;
      })
      .addCase('recording/start/fulfilled', (state) => {
        state.status = 'recording';
      })
      .addCase(
        recordingActions.startRejected.type,
        (state, action: PayloadAction<string>) => {
          state.status = 'error';
          state.error = action.payload;
        }
      )
      .addCase('recording/stop/pending', (state) => {
        state.status = 'stopping';
      })
      .addCase('recording/stop/fulfilled', (state) => {
        state.status = 'idle';
        state.connectionStatus = { microphone: false, system: false };
      })
      .addCase(
        recordingActions.setError.type,
        (state, action: PayloadAction<string>) => {
          state.error = action.payload;
        }
      )
      .addCase(
        recordingActions.updateConnectionStatus.type,
        (
          state,
          action: PayloadAction<{
            stream: 'microphone' | 'system';
            connected: boolean;
          }>
        ) => {
          state.connectionStatus[action.payload.stream] =
            action.payload.connected;
        }
      );
  },
});

export default recordingSlice.reducer;
