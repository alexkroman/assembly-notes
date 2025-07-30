import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { container } from 'tsyringe';

import type { Recording, RecordingsState } from '../../../types/index.js';
import type { DatabaseService } from '../../database.js';
import { DI_TOKENS } from '../../di-tokens.js';

// Async thunks for database operations
export const fetchAllRecordings = createAsyncThunk(
  'recordings/fetchAll',
  () => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    return databaseService.getAllRecordings();
  }
);

export const searchRecordings = createAsyncThunk(
  'recordings/search',
  (query: string) => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    return databaseService.searchRecordings(query);
  }
);

export const fetchRecording = createAsyncThunk(
  'recordings/fetchOne',
  (id: string) => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    return databaseService.getRecording(id);
  }
);

export const updateRecordingTitle = createAsyncThunk(
  'recordings/updateTitle',
  ({ id, title }: { id: string; title: string }) => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    databaseService.updateRecording(id, { title });
    return { id, title };
  }
);

export const updateRecordingSummary = createAsyncThunk(
  'recordings/updateSummary',
  ({ id, summary }: { id: string; summary: string }) => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    databaseService.updateRecording(id, { summary });
    return { id, summary };
  }
);

export const deleteRecording = createAsyncThunk(
  'recordings/delete',
  (id: string) => {
    const databaseService = container.resolve<DatabaseService>(
      DI_TOKENS.DatabaseService
    );
    databaseService.deleteRecording(id);
    return id;
  }
);

const initialState: RecordingsState = {
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
};

const recordingsSlice = createSlice({
  name: 'recordings',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentRecording: (state, action: PayloadAction<Recording | null>) => {
      state.currentRecording = action.payload;
    },
    // State-only updates (no database writes) - used for syncing from external sources like AI
    updateCurrentRecordingSummary: (state, action: PayloadAction<string>) => {
      if (state.currentRecording) {
        state.currentRecording.summary = action.payload;
        state.currentRecording.updated_at = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch all recordings
    builder
      .addCase(fetchAllRecordings.pending, (state) => {
        state.loading.fetchAll = true;
        state.error = null;
      })
      .addCase(fetchAllRecordings.fulfilled, (state, action) => {
        state.loading.fetchAll = false;
        state.recordings = action.payload;
      })
      .addCase(fetchAllRecordings.rejected, (state, action) => {
        state.loading.fetchAll = false;
        state.error = action.error.message ?? 'Failed to fetch recordings';
      });

    // Search recordings
    builder
      .addCase(searchRecordings.pending, (state) => {
        state.loading.search = true;
        state.error = null;
      })
      .addCase(searchRecordings.fulfilled, (state, action) => {
        state.loading.search = false;
        state.searchResults = action.payload;
      })
      .addCase(searchRecordings.rejected, (state, action) => {
        state.loading.search = false;
        state.error = action.error.message ?? 'Failed to search recordings';
      });

    // Fetch single recording
    builder
      .addCase(fetchRecording.pending, (state) => {
        state.loading.fetchOne = true;
        state.error = null;
      })
      .addCase(fetchRecording.fulfilled, (state, action) => {
        state.loading.fetchOne = false;
        state.currentRecording = action.payload;
      })
      .addCase(fetchRecording.rejected, (state, action) => {
        state.loading.fetchOne = false;
        state.error = action.error.message ?? 'Failed to fetch recording';
      });

    // Update recording title
    builder
      .addCase(updateRecordingTitle.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updateRecordingTitle.fulfilled, (state, action) => {
        state.loading.update = false;
        const { id, title } = action.payload;

        // Update in recordings list
        const recordingIndex = state.recordings.findIndex((r) => r.id === id);
        if (recordingIndex !== -1 && state.recordings[recordingIndex]) {
          state.recordings[recordingIndex].title = title;
          state.recordings[recordingIndex].updated_at = Date.now();
        }

        // Update current recording if it matches
        if (state.currentRecording?.id === id) {
          state.currentRecording.title = title;
          state.currentRecording.updated_at = Date.now();
        }

        // Update in search results
        const searchIndex = state.searchResults.findIndex((r) => r.id === id);
        if (searchIndex !== -1 && state.searchResults[searchIndex]) {
          state.searchResults[searchIndex].title = title;
          state.searchResults[searchIndex].updated_at = Date.now();
        }
      })
      .addCase(updateRecordingTitle.rejected, (state, action) => {
        state.loading.update = false;
        state.error =
          action.error.message ?? 'Failed to update recording title';
      });

    // Update recording summary
    builder
      .addCase(updateRecordingSummary.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updateRecordingSummary.fulfilled, (state, action) => {
        state.loading.update = false;
        const { id, summary } = action.payload;

        // Update in recordings list
        const recordingIndex = state.recordings.findIndex((r) => r.id === id);
        if (recordingIndex !== -1 && state.recordings[recordingIndex]) {
          state.recordings[recordingIndex].summary = summary;
          state.recordings[recordingIndex].updated_at = Date.now();
        }

        // Update current recording if it matches
        if (state.currentRecording?.id === id) {
          state.currentRecording.summary = summary;
          state.currentRecording.updated_at = Date.now();
        }

        // Update in search results
        const searchIndex = state.searchResults.findIndex((r) => r.id === id);
        if (searchIndex !== -1 && state.searchResults[searchIndex]) {
          state.searchResults[searchIndex].summary = summary;
          state.searchResults[searchIndex].updated_at = Date.now();
        }
      })
      .addCase(updateRecordingSummary.rejected, (state, action) => {
        state.loading.update = false;
        state.error =
          action.error.message ?? 'Failed to update recording summary';
      });

    // Delete recording
    builder
      .addCase(deleteRecording.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deleteRecording.fulfilled, (state, action) => {
        state.loading.delete = false;
        const deletedId = action.payload;

        // Remove from recordings list
        state.recordings = state.recordings.filter((r) => r.id !== deletedId);

        // Clear current recording if it was deleted
        if (state.currentRecording?.id === deletedId) {
          state.currentRecording = null;
        }

        // Remove from search results
        state.searchResults = state.searchResults.filter(
          (r) => r.id !== deletedId
        );
      })
      .addCase(deleteRecording.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.error.message ?? 'Failed to delete recording';
      });
  },
});

export const {
  setSearchQuery,
  clearError,
  setCurrentRecording,
  updateCurrentRecordingSummary,
} = recordingsSlice.actions;

export default recordingsSlice.reducer;
