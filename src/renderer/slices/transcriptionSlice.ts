import { createSlice } from '@reduxjs/toolkit';

import { recordingActions, transcriptionActions } from './syncActionTypes.js';
import type { TranscriptionState } from '../../types/redux.js';

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
      .addCase(recordingActions.startFulfilled, (state) => {
        state.isTranscribing = true;
        state.isActive = true;
        state.error = null;
      })
      .addCase(recordingActions.stopFulfilled, (state) => {
        state.isTranscribing = false;
        state.isActive = false;
      })
      .addCase(transcriptionActions.addTranscriptSegment, (state, action) => {
        state.segments.push(action.payload);
        state.currentTranscript = state.segments
          .filter((seg) => seg.isFinal)
          .map((seg) => seg.text)
          .join(' ');
      })
      .addCase(transcriptionActions.updateTranscriptBuffer, (state, action) => {
        if (action.payload.source === 'microphone') {
          state.microphoneTranscriptBuffer = action.payload.text ?? '';
        } else {
          state.systemAudioTranscriptBuffer = action.payload.text ?? '';
        }
      })
      .addCase(transcriptionActions.setTranscriptionError, (state, action) => {
        state.error = action.payload;
        state.isTranscribing = false;
      })
      .addCase(transcriptionActions.clearTranscription, (state) => {
        state.currentTranscript = '';
        state.segments = [];
        state.microphoneTranscriptBuffer = '';
        state.systemAudioTranscriptBuffer = '';
        state.error = null;
      })
      .addCase(transcriptionActions.loadExistingTranscript, (state, action) => {
        state.currentTranscript = action.payload;
        state.segments = [];
        state.microphoneTranscriptBuffer = '';
        state.systemAudioTranscriptBuffer = '';
        state.error = null;
      });
  },
});

export default transcriptionSlice.reducer;
