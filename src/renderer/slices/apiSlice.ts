import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  FullSettingsState,
  PromptTemplate,
  Recording,
} from '../../types/index.js';

/**
 * Wraps an async IPC call with standardized error handling.
 * Reduces boilerplate in RTK Query endpoints.
 */
async function ipcQuery<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<{ data: T } | { error: { status: 'CUSTOM_ERROR'; error: string } }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: error instanceof Error ? error.message : errorMessage,
      },
    };
  }
}

// Renderer-side API slice that calls IPC methods
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Settings', 'Recording', 'RecordingsList'],
  endpoints: (builder) => ({
    // Settings endpoints
    getSettings: builder.query<FullSettingsState, undefined>({
      queryFn: () =>
        ipcQuery(
          () => window.electronAPI.getSettings(),
          'Failed to get settings'
        ),
      providesTags: ['Settings'],
    }),

    updateSettings: builder.mutation<boolean, Partial<FullSettingsState>>({
      queryFn: (updates) =>
        ipcQuery(
          () => window.electronAPI.saveSettings(updates),
          'Failed to update settings'
        ),
      invalidatesTags: ['Settings'],
    }),

    updatePrompt: builder.mutation<boolean, { summaryPrompt: string }>({
      queryFn: (promptSettings) =>
        ipcQuery(
          () => window.electronAPI.savePrompt(promptSettings),
          'Failed to update prompt'
        ),
      invalidatesTags: ['Settings'],
    }),

    updatePrompts: builder.mutation<boolean, PromptTemplate[]>({
      queryFn: (prompts) =>
        ipcQuery(
          () => window.electronAPI.savePrompts(prompts),
          'Failed to update prompts'
        ),
      invalidatesTags: ['Settings'],
    }),

    // Recordings endpoints
    getAllRecordings: builder.query<Recording[], undefined>({
      queryFn: () =>
        ipcQuery(
          () => window.electronAPI.getAllRecordings(),
          'Failed to fetch recordings'
        ),
      providesTags: ['RecordingsList'],
    }),

    searchRecordings: builder.query<Recording[], string>({
      queryFn: (query) =>
        ipcQuery(
          () => window.electronAPI.searchRecordings(query),
          'Failed to search recordings'
        ),
      providesTags: ['RecordingsList'],
    }),

    getRecording: builder.query<Recording, string>({
      queryFn: async (id) => {
        const result = await ipcQuery(
          () => window.electronAPI.getRecording(id),
          'Failed to fetch recording'
        );
        if ('data' in result && !result.data) {
          return {
            error: { status: 'CUSTOM_ERROR', error: 'Recording not found' },
          };
        }
        return result as { data: Recording };
      },
      providesTags: (_, __, id) => [{ type: 'Recording', id }],
    }),

    updateRecordingTitle: builder.mutation<
      boolean,
      { id: string; title: string }
    >({
      queryFn: ({ id, title }) =>
        ipcQuery(async () => {
          await window.electronAPI.updateRecordingTitle(id, title);
          return true;
        }, 'Failed to update recording title'),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Recording', id },
        'RecordingsList',
      ],
    }),

    updateRecordingSummary: builder.mutation<
      boolean,
      { id: string; summary: string }
    >({
      queryFn: ({ id, summary }) =>
        ipcQuery(async () => {
          await window.electronAPI.updateRecordingSummary(id, summary);
          return true;
        }, 'Failed to update recording summary'),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Recording', id },
        'RecordingsList',
      ],
    }),

    deleteRecording: builder.mutation<boolean, string>({
      queryFn: (id) =>
        ipcQuery(
          () => window.electronAPI.deleteRecording(id),
          'Failed to delete recording'
        ),
      invalidatesTags: (_, __, id) => [
        { type: 'Recording', id },
        'RecordingsList',
      ],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useUpdatePromptMutation,
  useUpdatePromptsMutation,
  useGetAllRecordingsQuery,
  useSearchRecordingsQuery,
  useGetRecordingQuery,
  useUpdateRecordingTitleMutation,
  useUpdateRecordingSummaryMutation,
  useDeleteRecordingMutation,
} = apiSlice;
