import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type {
  TranscriptSegment,
  TranscriptionState,
} from '../../../types/redux.js';

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
  reducers: {
    addTranscriptSegment: (state, action: PayloadAction<TranscriptSegment>) => {
      state.segments.push(action.payload);
      if (action.payload.isFinal) {
        // Append the new final transcript to the existing transcript
        const newText = action.payload.text.trim();
        if (newText) {
          state.currentTranscript = state.currentTranscript
            ? `${state.currentTranscript} ${newText}`
            : newText;
        }
      }
    },
    updateTranscriptBuffer: (
      state,
      action: PayloadAction<{ source: 'microphone' | 'system'; text: string }>
    ) => {
      if (action.payload.source === 'microphone') {
        state.microphoneTranscriptBuffer = action.payload.text;
      } else {
        state.systemAudioTranscriptBuffer = action.payload.text;
      }
    },
    setTranscriptionError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isTranscribing = false;
    },
    clearTranscription: () => initialState,
    clearTranscriptionError: (state) => {
      state.error = null;
    },
    loadExistingTranscript: (state, action: PayloadAction<string>) => {
      state.currentTranscript = action.payload;
      // Clear segments since this is a pre-existing transcript, not live segments
      state.segments = [];
      state.microphoneTranscriptBuffer = '';
      state.systemAudioTranscriptBuffer = '';
      state.error = null;
    },
  },
});

export const {
  addTranscriptSegment,
  updateTranscriptBuffer,
  setTranscriptionError,
  clearTranscription,
  clearTranscriptionError,
  loadExistingTranscript,
} = transcriptionSlice.actions;

export default transcriptionSlice.reducer;
