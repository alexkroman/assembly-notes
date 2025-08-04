import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { updateActions } from './syncActionTypes.js';
import type { UpdateInfo } from '../../types/common.js';
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
      .addCase('update/startChecking', (state) => {
        state.checking = true;
        state.error = null;
      })
      .addCase(
        updateActions.updateAvailable.type,
        (state, action: PayloadAction<UpdateInfo>) => {
          state.checking = false;
          state.available = true;
          state.updateInfo = action.payload;
        }
      )
      .addCase('update/updateNotAvailable', (state) => {
        state.checking = false;
        state.available = false;
        state.updateInfo = null;
      })
      .addCase('update/startDownloading', (state) => {
        state.downloading = true;
        state.progress = 0;
      })
      .addCase(
        updateActions.updateProgress.type,
        (state, action: PayloadAction<{ percent: number }>) => {
          state.progress = action.payload.percent;
        }
      )
      .addCase(
        updateActions.downloadComplete.type,
        (state, action: PayloadAction<UpdateInfo>) => {
          state.downloading = false;
          state.downloaded = true;
          state.updateInfo = action.payload;
        }
      )
      .addCase(
        updateActions.setError.type,
        (state, action: PayloadAction<string>) => {
          state.checking = false;
          state.downloading = false;
          state.error = action.payload;
        }
      )
      .addCase('update/resetUpdate', (state) => {
        Object.assign(state, initialState);
      });
  },
});

export default updateSlice.reducer;
