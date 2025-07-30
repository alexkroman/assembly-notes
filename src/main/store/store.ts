import {
  configureStore,
  type ThunkAction,
  type Action,
} from '@reduxjs/toolkit';
import { stateSyncEnhancer } from 'electron-redux/es/main.js';

import recordingReducer from './slices/recordingSlice.js';
import recordingsReducer from './slices/recordingsSlice.js';
import settingsReducer from './slices/settingsSlice.js';
import transcriptionReducer from './slices/transcriptionSlice.js';
import updateReducer from './slices/updateSlice.js';

export const store = configureStore({
  reducer: {
    recording: recordingReducer,
    recordings: recordingsReducer,
    transcription: transcriptionReducer,
    settings: settingsReducer,
    update: updateReducer,
  },
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(stateSyncEnhancer()),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // All Redux state and actions are now serializable
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action
>;
