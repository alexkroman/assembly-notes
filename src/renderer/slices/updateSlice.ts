import { createSlice } from '@reduxjs/toolkit';

import { updateActions } from './syncActionTypes.js';
import type { UpdateState } from '../../types/redux.js';

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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateActions.startChecking, (state) => {
        state.checking = true;
        state.error = null;
      })
      .addCase(updateActions.updateAvailable, (state, action) => {
        state.checking = false;
        state.available = true;
        state.updateInfo = action.payload;
      })
      .addCase(updateActions.updateNotAvailable, (state) => {
        state.checking = false;
        state.available = false;
        state.updateInfo = null;
      })
      .addCase(updateActions.startDownloading, (state) => {
        state.downloading = true;
        state.progress = 0;
      })
      .addCase(updateActions.updateProgress, (state, action) => {
        state.progress = action.payload.percent;
      })
      .addCase(updateActions.downloadComplete, (state, action) => {
        state.downloading = false;
        state.downloaded = true;
        state.updateInfo = action.payload;
      })
      .addCase(updateActions.setError, (state, action) => {
        state.checking = false;
        state.downloading = false;
        state.error = action.payload;
      })
      .addCase(updateActions.resetUpdate, (state) => {
        Object.assign(state, initialState);
      });
  },
});

export default updateSlice.reducer;
