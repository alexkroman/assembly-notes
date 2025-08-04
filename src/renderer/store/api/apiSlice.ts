import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  FullSettingsState,
  PromptTemplate,
  Recording,
} from '../../../types/index.js';

// Renderer-side API slice that calls IPC methods
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Settings', 'Recording', 'RecordingsList'],
  endpoints: (builder) => ({
    // Settings endpoints
    getSettings: builder.query<FullSettingsState, undefined>({
      queryFn: async () => {
        try {
          const data = await window.electronAPI.getSettings();
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to get settings',
            },
          };
        }
      },
      providesTags: ['Settings'],
    }),

    updateSettings: builder.mutation<boolean, Partial<FullSettingsState>>({
      queryFn: async (updates) => {
        try {
          const data = await window.electronAPI.saveSettings(updates);
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to update settings',
            },
          };
        }
      },
      invalidatesTags: ['Settings'],
    }),

    updatePrompt: builder.mutation<boolean, { summaryPrompt: string }>({
      queryFn: async (promptSettings) => {
        try {
          const data = await window.electronAPI.savePrompt(promptSettings);
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to update prompt',
            },
          };
        }
      },
      invalidatesTags: ['Settings'],
    }),

    updatePrompts: builder.mutation<boolean, PromptTemplate[]>({
      queryFn: async (prompts) => {
        try {
          const data = await window.electronAPI.savePrompts(prompts);
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to update prompts',
            },
          };
        }
      },
      invalidatesTags: ['Settings'],
    }),

    // Recordings endpoints
    getAllRecordings: builder.query<Recording[], undefined>({
      queryFn: async () => {
        try {
          const data =
            (await window.electronAPI.getAllRecordings()) as Recording[];
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch recordings',
            },
          };
        }
      },
      providesTags: ['RecordingsList'],
    }),

    searchRecordings: builder.query<Recording[], string>({
      queryFn: async (query) => {
        try {
          const data = (await window.electronAPI.searchRecordings(
            query
          )) as Recording[];
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to search recordings',
            },
          };
        }
      },
      providesTags: ['RecordingsList'],
    }),

    getRecording: builder.query<Recording, string>({
      queryFn: async (id) => {
        try {
          const data = (await window.electronAPI.getRecording(id)) as Recording;
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch recording',
            },
          };
        }
      },
      providesTags: (_, __, id) => [{ type: 'Recording', id }],
    }),

    updateRecordingTitle: builder.mutation<
      boolean,
      { id: string; title: string }
    >({
      queryFn: async ({ id, title }) => {
        try {
          await window.electronAPI.updateRecordingTitle(id, title);
          return { data: true };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to update recording title',
            },
          };
        }
      },
      invalidatesTags: (_, __, { id }) => [
        { type: 'Recording', id },
        'RecordingsList',
      ],
    }),

    updateRecordingSummary: builder.mutation<
      boolean,
      { id: string; summary: string }
    >({
      queryFn: async ({ id, summary }) => {
        try {
          await window.electronAPI.updateRecordingSummary(id, summary);
          return { data: true };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to update recording summary',
            },
          };
        }
      },
      invalidatesTags: (_, __, { id }) => [
        { type: 'Recording', id },
        'RecordingsList',
      ],
    }),

    deleteRecording: builder.mutation<boolean, string>({
      queryFn: async (id) => {
        try {
          const data = await window.electronAPI.deleteRecording(id);
          return { data };
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to delete recording',
            },
          };
        }
      },
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
