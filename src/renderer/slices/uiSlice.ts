import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { UIState, ModalType } from '../../types/redux.js';

const initialState: UIState = {
  currentPage: 'list',
  currentRecordingId: null,
  isNewRecording: false,
  activeModal: null,
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
    setActiveModal: (state, action: PayloadAction<ModalType>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
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
  setActiveModal,
  closeModal,
  setStatus,
} = uiSlice.actions;

export default uiSlice.reducer;
