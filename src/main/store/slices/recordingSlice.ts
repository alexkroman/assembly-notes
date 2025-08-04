import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RecordingState } from '../../../types/redux.js';
import { createResetHandler } from '../helpers/commonReducers.js';
import { RootState } from '../store.js';

const initialState: RecordingState = {
  status: 'idle',
  recordingId: null,
  startTime: null,
  error: null,
  connectionStatus: {
    microphone: false,
    system: false,
  },
};

// Async thunk for starting recording - returns only serializable data
export const startRecording = createAsyncThunk<
  { recordingId: string },
  undefined,
  { state: RootState }
>('recording/start', (_, { getState, rejectWithValue }) => {
  const state = getState();
  const apiKey = state.settings.assemblyaiKey;

  if (!apiKey) {
    return rejectWithValue(
      'AssemblyAI API Key is not set. Please add it in settings.'
    );
  }

  // MUST have a currentRecording from database before starting
  const recordingId = state.recordings.currentRecording?.id;

  if (!recordingId) {
    return rejectWithValue(
      'No current recording available. Please create a new recording first.'
    );
  }

  // Return only serializable data - connections are handled by RecordingManager
  return { recordingId };
});

// Async thunk for stopping recording
export const stopRecording = createAsyncThunk<
  undefined,
  undefined,
  { state: RootState }
>('recording/stop', () => {
  // Connection management is handled by RecordingManager
  return undefined;
});

const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    setRecordingError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.status = 'error';
    },
    clearRecordingError: (state) => {
      state.error = null;
    },
    updateConnectionStatus: (
      state,
      action: PayloadAction<{
        stream: 'microphone' | 'system';
        connected: boolean;
      }>
    ) => {
      state.connectionStatus[action.payload.stream] = action.payload.connected;

      // If both are connected, clear any errors
      if (state.connectionStatus.microphone && state.connectionStatus.system) {
        state.error = null;
      }
    },
    reset: createResetHandler(initialState),
  },
  extraReducers: (builder) => {
    builder
      // Start recording
      .addCase(startRecording.pending, (state) => {
        state.status = 'starting';
        state.error = null;
      })
      .addCase(startRecording.fulfilled, (state, action) => {
        state.status = 'recording';
        state.recordingId = action.payload.recordingId;
        state.startTime = Date.now();
      })
      .addCase(startRecording.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      // Stop recording
      .addCase(stopRecording.pending, (state) => {
        state.status = 'stopping';
      })
      .addCase(stopRecording.fulfilled, () => {
        // Reset to initial state
        return initialState;
      })
      .addCase(stopRecording.rejected, (state) => {
        state.status = 'error';
        state.error = 'Failed to stop recording';
      });
  },
});

export const {
  setRecordingError,
  clearRecordingError,
  updateConnectionStatus,
  reset: resetRecording,
} = recordingSlice.actions;

export default recordingSlice.reducer;
