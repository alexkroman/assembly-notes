import { configureStore } from '@reduxjs/toolkit';
import { stateSyncEnhancer } from 'electron-redux/es/renderer.js';

// Import API slice
// Import slice reducers
import { apiSlice } from './slices/apiSlice.js';
import recordingReducer from './slices/recordingSlice.js';
import recordingsReducer from './slices/recordingsSlice.js';
import settingsReducer from './slices/settingsSlice.js';
import transcriptionReducer from './slices/transcriptionSlice.js';
import uiReducer, {
  navigateToList,
  navigateToNewRecording,
  navigateToRecording,
  setActiveModal,
  closeModal,
  setStatus,
} from './slices/uiSlice.js';
import updateReducer from './slices/updateSlice.js';

// --- Store Configuration ---

export function createRendererStore() {
  const store = configureStore({
    reducer: {
      recording: recordingReducer,
      recordings: recordingsReducer,
      transcription: transcriptionReducer,
      settings: settingsReducer,
      update: updateReducer,
      ui: uiReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(stateSyncEnhancer()),
    middleware: (getDefaultMiddleware) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).concat(apiSlice.middleware) as any,
  });

  return store;
}

// Re-export UI actions for convenience
export {
  navigateToList,
  navigateToNewRecording,
  navigateToRecording,
  setActiveModal,
  closeModal,
  setStatus,
};

// Export renderer-specific types
export type RootState = ReturnType<
  ReturnType<typeof createRendererStore>['getState']
>;
export type AppDispatch = ReturnType<typeof createRendererStore>['dispatch'];
