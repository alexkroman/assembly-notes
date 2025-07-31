import { configureStore } from '@reduxjs/toolkit';
import { stateSyncEnhancer } from 'electron-redux/es/renderer.js';

// Import local UI slice
import type { Recording } from '../types/common.js';
import type {
  RecordingState,
  RecordingsState,
  SettingsState,
  TranscriptSegment,
  TranscriptionState,
} from '../types/redux.js';
import uiReducer, {
  navigateToList,
  navigateToNewRecording,
  navigateToRecording,
  setShowChannelModal,
  setShowPromptModal,
  setShowSettingsModal,
  setStatus,
} from './slices/uiSlice.js';

// Specific action types for sync actions
interface BaseSyncAction {
  type: string;
  payload?: unknown;
  meta?: { arg?: unknown };
  error?: { message?: string };
}

// Recording slice action types
type RecordingSyncAction =
  | { type: 'recording/start/pending' }
  | { type: 'recording/start/fulfilled'; payload: { recordingId: string } }
  | { type: 'recording/start/rejected'; payload: string }
  | { type: 'recording/stop/pending' }
  | { type: 'recording/stop/fulfilled' }
  | { type: 'recording/setError'; payload: string }
  | {
      type: 'recording/updateConnectionStatus';
      payload: { stream: 'microphone' | 'system'; connected: boolean };
    };

// Transcription slice action types
type TranscriptionSyncAction =
  | { type: 'transcription/addTranscriptSegment'; payload: TranscriptSegment }
  | {
      type: 'transcription/updateTranscriptBuffer';
      payload: { source?: 'microphone' | 'system'; text?: string };
    }
  | { type: 'transcription/setTranscriptionError'; payload: string }
  | { type: 'transcription/clearTranscription' }
  | { type: 'transcription/loadExistingTranscript'; payload: string };

// Settings slice action types
type SettingsSyncAction =
  | {
      type: 'settings/fetchSettings/fulfilled';
      payload: Partial<SettingsState>;
    }
  | { type: 'settings/saveSettings/fulfilled'; payload: Partial<SettingsState> }
  | { type: 'settings/savePrompt/fulfilled'; payload: Partial<SettingsState> }
  | { type: 'settings/savePrompts/fulfilled'; payload: Partial<SettingsState> }
  | { type: 'settings/selectPrompt/fulfilled'; payload: Partial<SettingsState> }
  | {
      type: 'settings/saveSelectedChannel/fulfilled';
      payload: Partial<SettingsState>;
    };

// Recordings slice action types
type RecordingsSyncAction =
  | { type: 'recordings/setCurrentRecording'; payload: Recording | null }
  | { type: 'recordings/updateCurrentRecordingSummary'; payload: string };

// Union of all sync action types
type SyncAction =
  | BaseSyncAction
  | RecordingSyncAction
  | TranscriptionSyncAction
  | SettingsSyncAction
  | RecordingsSyncAction;

// Generic state type for the sync reducer
type SyncState =
  | RecordingState
  | RecordingsState
  | TranscriptionState
  | SettingsState;

// Create sync reducers that handle actions from main process
const createSyncReducer = <T extends SyncState>(initialState: T) => {
  return (state: T = initialState, action: SyncAction): T => {
    // Handle specific actions that update recording/transcription state
    switch (action.type) {
      // Recording slice actions
      case 'recording/start/pending':
        if ('status' in state) {
          return { ...state, status: 'starting', error: null } as T;
        }
        break;
      case 'recording/start/fulfilled':
        if ('status' in state) {
          return { ...state, status: 'recording' } as T;
        }
        if ('isTranscribing' in state) {
          return {
            ...state,
            isTranscribing: true,
            isActive: true,
            error: null,
          } as T;
        }
        break;
      case 'recording/start/rejected':
        if ('status' in state) {
          return {
            ...state,
            status: 'error',
            error: action.payload as string,
          } as T;
        }
        break;
      case 'recording/stop/pending':
        if ('status' in state) {
          return { ...state, status: 'stopping' } as T;
        }
        break;
      case 'recording/stop/fulfilled':
        if ('status' in state) {
          return {
            ...state,
            status: 'idle',
            connectionStatus: { microphone: false, system: false },
          } as T;
        }
        if ('isTranscribing' in state) {
          return { ...state, isTranscribing: false, isActive: false } as T;
        }
        break;
      case 'recording/setError':
        if ('error' in state) {
          return { ...state, error: action.payload } as T;
        }
        break;
      case 'recording/updateConnectionStatus':
        if ('connectionStatus' in state) {
          const payload = action.payload as {
            stream: 'microphone' | 'system';
            connected: boolean;
          };
          return {
            ...state,
            connectionStatus: {
              ...state.connectionStatus,
              [payload.stream]: payload.connected,
            },
          } as T;
        }
        break;

      // Transcription slice actions
      case 'transcription/addTranscriptSegment':
        if ('segments' in state) {
          const newSegments = [
            ...state.segments,
            action.payload as TranscriptSegment,
          ];
          return {
            ...state,
            segments: newSegments,
            currentTranscript: newSegments
              .filter((seg) => seg.isFinal)
              .map((seg) => seg.text)
              .join(' '),
          } as T;
        }
        break;
      case 'transcription/updateTranscriptBuffer':
        if ('microphoneTranscriptBuffer' in state) {
          const payload = action.payload as { source?: string; text?: string };
          const updates: Partial<TranscriptionState> = {};
          if (payload.source === 'microphone') {
            updates.microphoneTranscriptBuffer = payload.text ?? '';
          } else {
            updates.systemAudioTranscriptBuffer = payload.text ?? '';
          }
          return { ...state, ...updates } as T;
        }
        break;
      case 'transcription/setTranscriptionError':
        if ('error' in state) {
          return {
            ...state,
            error: action.payload as string,
            isTranscribing: false,
          } as T;
        }
        break;
      case 'transcription/clearTranscription':
        if ('currentTranscript' in state) {
          return {
            ...state,
            currentTranscript: '',
            segments: [],
            microphoneTranscriptBuffer: '',
            systemAudioTranscriptBuffer: '',
            error: null,
          } as T;
        }
        break;
      case 'transcription/loadExistingTranscript':
        if ('currentTranscript' in state) {
          return {
            ...state,
            currentTranscript: action.payload as string,
            segments: [],
            microphoneTranscriptBuffer: '',
            systemAudioTranscriptBuffer: '',
            error: null,
          } as T;
        }
        break;

      // Settings slice actions (simplified - only sync what's needed)
      case 'settings/fetchSettings/fulfilled':
      case 'settings/saveSettings/fulfilled':
      case 'settings/savePrompt/fulfilled':
      case 'settings/savePrompts/fulfilled':
      case 'settings/selectPrompt/fulfilled':
      case 'settings/saveSelectedChannel/fulfilled':
        if ('assemblyaiKey' in state && action.payload) {
          return {
            ...state,
            ...action.payload,
            loading: false,
            error: null,
          } as T;
        }
        break;

      // Recordings slice actions (only the essential ones)
      case 'recordings/setCurrentRecording':
        if ('currentRecording' in state) {
          return {
            ...state,
            currentRecording: action.payload as Recording | null,
          } as T;
        }
        break;
      case 'recordings/updateCurrentRecordingSummary':
        if ('currentRecording' in state) {
          return {
            ...state,
            currentRecording: state.currentRecording
              ? { ...state.currentRecording, summary: action.payload as string }
              : null,
          } as T;
        }
        break;

      default:
        return state;
    }
    return state;
  };
};

// Configure store for renderer process
export function createRendererStore() {
  const store = configureStore({
    reducer: {
      recording: createSyncReducer<RecordingState>({
        status: 'idle',
        recordingId: null,
        startTime: null,
        error: null,
        connectionStatus: {
          microphone: false,
          system: false,
        },
      }),
      recordings: createSyncReducer<RecordingsState>({
        recordings: [],
        currentRecording: null,
        searchResults: [],
        searchQuery: '',
        loading: {
          fetchAll: false,
          search: false,
          fetchOne: false,
          update: false,
          delete: false,
        },
        error: null,
      }),
      transcription: createSyncReducer<TranscriptionState>({
        currentTranscript: '',
        segments: [],
        isTranscribing: false,
        isActive: false,
        microphoneTranscriptBuffer: '',
        systemAudioTranscriptBuffer: '',
        error: null,
      }),
      settings: createSyncReducer<SettingsState>({
        assemblyaiKey: '',
        slackChannels: '',
        slackInstallations: [],
        selectedSlackInstallation: '',
        availableChannels: [],
        selectedChannelId: '',
        summaryPrompt: '',
        selectedPromptIndex: 0,
        prompts: [],
        autoStart: false,
        loading: false,
        error: null,
        theme: 'dark' as const,
        hasAssemblyAIKey: false,
        hasSlackConfigured: false,
      }),
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
  setShowChannelModal,
  setShowPromptModal,
  setShowSettingsModal,
  setStatus,
};

// Export renderer-specific types
export type RootState = ReturnType<
  ReturnType<typeof createRendererStore>['getState']
>;
export type AppDispatch = ReturnType<typeof createRendererStore>['dispatch'];
