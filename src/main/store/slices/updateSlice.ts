import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { UpdateInfo, ProgressInfo, UpdateState } from '../../../types/index.js';
import { createResetHandler } from '../helpers/commonReducers.js';

const initialState: UpdateState = {
  checking: false,
  available: false,
  downloading: false,
  progress: 0,
  downloaded: false,
  error: null,
  updateInfo: null,
};

const updateSlice = createSlice({
  name: 'update',
  initialState,
  reducers: {
    startChecking: (state) => {
      state.checking = true;
      state.error = null;
    },
    updateAvailable: (state, action: PayloadAction<UpdateInfo>) => {
      state.checking = false;
      state.available = true;
      state.updateInfo = action.payload;
    },
    updateNotAvailable: (state) => {
      state.checking = false;
      state.available = false;
      state.updateInfo = null;
    },
    startDownloading: (state) => {
      state.downloading = true;
      state.progress = 0;
    },
    updateProgress: (state, action: PayloadAction<ProgressInfo>) => {
      state.progress = action.payload.percent;
    },
    downloadComplete: (state, action: PayloadAction<UpdateInfo>) => {
      state.downloading = false;
      state.downloaded = true;
      state.updateInfo = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.checking = false;
      state.downloading = false;
      state.error = action.payload;
    },
    resetUpdate: createResetHandler(initialState),
  },
});

export const {
  startChecking,
  updateAvailable,
  updateNotAvailable,
  startDownloading,
  updateProgress,
  downloadComplete,
  setError,
  resetUpdate,
} = updateSlice.actions;

export default updateSlice.reducer;
