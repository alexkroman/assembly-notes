import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { UIState } from '../../types/redux.js';

const initialState: UIState = {
  currentPage: 'list',
  currentRecordingId: null,
  isNewRecording: false,
  showSettingsModal: false,
  showPromptModal: false,
  showChannelModal: false,
  status: '',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    navigateToRecording: (state, action: PayloadAction<string | undefined>) => {
      state.currentRecordingId = action.payload ?? null;
      state.currentPage = 'recording';
      state.isNewRecording = false;
    },
    navigateToNewRecording: (
      state,
      action: PayloadAction<string | undefined>
    ) => {
      state.currentRecordingId = action.payload ?? null;
      state.currentPage = 'recording';
      state.isNewRecording = true;
    },
    navigateToList: (state) => {
      state.currentPage = 'list';
      state.currentRecordingId = null;
      state.isNewRecording = false;
    },
    setShowSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.showSettingsModal = action.payload;
    },
    setShowPromptModal: (state, action: PayloadAction<boolean>) => {
      state.showPromptModal = action.payload;
    },
    setShowChannelModal: (state, action: PayloadAction<boolean>) => {
      state.showChannelModal = action.payload;
    },
    setStatus: (state, action: PayloadAction<string>) => {
      state.status = action.payload;
    },
  },
});

export const {
  navigateToRecording,
  navigateToNewRecording,
  navigateToList,
  setShowSettingsModal,
  setShowPromptModal,
  setShowChannelModal,
  setStatus,
} = uiSlice.actions;

export default uiSlice.reducer;
