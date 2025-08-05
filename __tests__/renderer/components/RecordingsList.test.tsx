/**
 * @jest-environment jsdom
 */
/* eslint-disable import/order */
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import '@testing-library/jest-dom';
import { RecordingsList } from '../../../src/renderer/components/RecordingsList';

// Mock the store actions
jest.mock('../../../src/renderer/store', () => ({
  navigateToNewRecording: jest.fn((id) => ({
    type: 'ui/navigateToNewRecording',
    payload: id,
  })),
  setActiveModal: jest.fn((modal) => ({
    type: 'ui/setActiveModal',
    payload: modal,
  })),
}));

// Mock RTK Query hooks
jest.mock('../../../src/renderer/slices/apiSlice', () => ({
  useGetAllRecordingsQuery: jest.fn(),
  useSearchRecordingsQuery: jest.fn(),
  useDeleteRecordingMutation: jest.fn(),
}));

// Import the mocked hooks
import {
  useGetAllRecordingsQuery,
  useSearchRecordingsQuery,
  useDeleteRecordingMutation,
} from '../../../src/renderer/slices/apiSlice';
import { Recording } from '../../../src/types/common';

// Mock electron API
const mockElectronAPI = {
  getAllRecordings: jest.fn(),
  loadRecording: jest.fn(),
  deleteRecording: jest.fn(),
  searchRecordings: jest.fn(),
  newRecording: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
});

// Mock navigation action
const mockOnNavigateToRecording = jest.fn();

// Create simple mock store
const createMockStore = (assemblyaiKey = 'test-key') => {
  return configureStore({
    reducer: {
      settings: (state = { assemblyaiKey }) => state,
      recording: (state = { status: 'idle' }) => state,
      ui: (state = { currentPage: 'list', currentRecordingId: null }) => state,
    },
    preloadedState: {
      settings: { assemblyaiKey },
      recording: { status: 'idle' },
      ui: { currentPage: 'list', currentRecordingId: null },
    },
  });
};

describe('RecordingsList', () => {
  const mockRecordings: Recording[] = [
    {
      id: 'rec-1',
      title: 'First Recording',
      transcript: 'This is the first recording transcript',
      summary: 'First summary',
      created_at: Date.now() - 3600000,
      updated_at: Date.now() - 3600000,
    },
    {
      id: 'rec-2',
      title: 'Second Recording',
      transcript: 'This is the second recording transcript',
      summary: 'Second summary',
      created_at: Date.now() - 7200000,
      updated_at: Date.now() - 7200000,
    },
  ];

  const mockUseGetAllRecordingsQuery =
    useGetAllRecordingsQuery as jest.MockedFunction<
      typeof useGetAllRecordingsQuery
    >;
  const mockUseSearchRecordingsQuery =
    useSearchRecordingsQuery as jest.MockedFunction<
      typeof useSearchRecordingsQuery
    >;
  const mockUseDeleteRecordingMutation =
    useDeleteRecordingMutation as jest.MockedFunction<
      typeof useDeleteRecordingMutation
    >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseGetAllRecordingsQuery.mockReturnValue({
      data: mockRecordings,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockUseSearchRecordingsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    mockUseDeleteRecordingMutation.mockReturnValue([
      jest.fn().mockResolvedValue({ data: true }),
      { isLoading: false },
    ] as any);
  });

  const renderList = (assemblyaiKey = 'test-key') => {
    const store = createMockStore(assemblyaiKey);
    return render(
      <Provider store={store}>
        <RecordingsList onNavigateToRecording={mockOnNavigateToRecording} />
      </Provider>
    );
  };

  it('should render recordings list with all recordings', async () => {
    renderList();

    await waitFor(() => {
      expect(screen.getByText('First Recording')).toBeInTheDocument();
      expect(screen.getByText('Second Recording')).toBeInTheDocument();
    });
  });

  it('should display empty state when no recordings', async () => {
    mockUseGetAllRecordingsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('No recordings yet')).toBeInTheDocument();
    });
  });

  it('should disable new recording when API key is missing', () => {
    renderList(''); // Empty API key

    const newButton = screen.getByTestId('new-recording-btn');
    expect(newButton).toBeDisabled();
  });
});
