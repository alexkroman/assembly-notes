import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { transcriptionActions } from './syncActionTypes.js';
import type {
  TranscriptionState,
  TranscriptSegment,
} from '../../types/redux.js';

const initialState: TranscriptionState = {
  currentTranscript: '',
  segments: [],
  isTranscribing: false,
  isActive: false,
  microphoneTranscriptBuffer: '',
  systemAudioTranscriptBuffer: '',
  error: null,
};

const transcriptionSlice = createSlice({
  name: 'transcription',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Also listen to recording actions that affect transcription
      .addCase('recording/start/fulfilled', (state) => {
        state.isTranscribing = true;
        state.isActive = true;
        state.error = null;
      })
      .addCase('recording/stop/fulfilled', (state) => {
        state.isTranscribing = false;
        state.isActive = false;
      })
      .addCase(
        transcriptionActions.addTranscriptSegment.type,
        (state, action: PayloadAction<TranscriptSegment>) => {
          state.segments.push(action.payload);
          state.currentTranscript = state.segments
            .filter((seg) => seg.isFinal)
            .map((seg) => seg.text)
            .join(' ');
        }
      )
      .addCase(
        transcriptionActions.updateTranscriptBuffer.type,
        (
          state,
          action: PayloadAction<{
            source?: 'microphone' | 'system';
            text?: string;
          }>
        ) => {
          if (action.payload.source === 'microphone') {
            state.microphoneTranscriptBuffer = action.payload.text ?? '';
          } else {
            state.systemAudioTranscriptBuffer = action.payload.text ?? '';
          }
        }
      )
      .addCase(
        transcriptionActions.setTranscriptionError.type,
        (state, action: PayloadAction<string>) => {
          state.error = action.payload;
          state.isTranscribing = false;
        }
      )
      .addCase('transcription/clearTranscription', (state) => {
        state.currentTranscript = '';
        state.segments = [];
        state.microphoneTranscriptBuffer = '';
        state.systemAudioTranscriptBuffer = '';
        state.error = null;
      })
      .addCase(
        transcriptionActions.loadExistingTranscript.type,
        (state, action: PayloadAction<string>) => {
          state.currentTranscript = action.payload;
          state.segments = [];
          state.microphoneTranscriptBuffer = '';
          state.systemAudioTranscriptBuffer = '';
          state.error = null;
        }
      );
  },
});

export default transcriptionSlice.reducer;
