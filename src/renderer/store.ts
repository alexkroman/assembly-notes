import { configureStore } from '@reduxjs/toolkit';
import { stateSyncEnhancer } from 'electron-redux/es/renderer.js';

// Import slice reducers
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
    },
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(stateSyncEnhancer()),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      }),
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
