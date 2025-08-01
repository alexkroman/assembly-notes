/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import '@testing-library/jest-dom';

import { RecordingsList } from '../../../src/renderer/components/RecordingsList';
import {
  navigateToNewRecording,
  setShowSettingsModal,
} from '../../../src/renderer/store';
import { Recording } from '../../../src/types/common';

// Mock the store actions
jest.mock('../../../src/renderer/store', () => ({
  navigateToNewRecording: jest.fn((id) => ({
    type: 'ui/navigateToNewRecording',
    payload: id,
  })),
  setShowSettingsModal: jest.fn((show) => ({
    type: 'ui/setShowSettingsModal',
    payload: show,
  })),
}));

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

// Create mock store
const createMockStore = (assemblyaiKey = '') => {
  return configureStore({
    reducer: {
      settings: (
        state = {
          assemblyaiKey,
        }
      ) => state,
      recording: (
        state = {
          status: 'idle',
        }
      ) => state,
      ui: (
        state = {
          currentPage: 'list',
          currentRecordingId: null,
        }
      ) => state,
    },
    preloadedState: {
      settings: {
        assemblyaiKey,
      },
      recording: {
        status: 'idle',
      },
      ui: {
        currentPage: 'list',
        currentRecordingId: null,
      },
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
      created_at: Date.now() - 3600000, // 1 hour ago
      updated_at: Date.now() - 3600000,
    },
    {
      id: 'rec-2',
      title: 'Second Recording',
      transcript: 'This is the second recording transcript',
      summary: 'Second summary',
      created_at: Date.now() - 7200000, // 2 hours ago
      updated_at: Date.now() - 7200000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.getAllRecordings.mockResolvedValue(mockRecordings);
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
    mockElectronAPI.getAllRecordings.mockResolvedValue([]);
    renderList();

    await waitFor(() => {
      expect(screen.getByText('No recordings yet')).toBeInTheDocument();
      expect(
        screen.getByText('Click "New Recording" to get started')
      ).toBeInTheDocument();
    });
  });

  it('should fetch recordings on mount', async () => {
    renderList();

    await waitFor(() => {
      expect(mockElectronAPI.getAllRecordings).toHaveBeenCalled();
    });
  });

  it('should handle search input', async () => {
    mockElectronAPI.searchRecordings.mockResolvedValue([mockRecordings[0]]);
    renderList();

    const searchInput = screen.getByPlaceholderText('Search recordings...');
    fireEvent.change(searchInput, { target: { value: 'first' } });

    await waitFor(
      () => {
        expect(mockElectronAPI.searchRecordings).toHaveBeenCalledWith('first');
      },
      { timeout: 400 }
    );
  });

  it('should debounce search input', async () => {
    renderList();

    const searchInput = screen.getByPlaceholderText('Search recordings...');

    // Type quickly
    fireEvent.change(searchInput, { target: { value: 'f' } });
    fireEvent.change(searchInput, { target: { value: 'fi' } });
    fireEvent.change(searchInput, { target: { value: 'fir' } });
    fireEvent.change(searchInput, { target: { value: 'firs' } });
    fireEvent.change(searchInput, { target: { value: 'first' } });

    // Should not be called immediately
    expect(mockElectronAPI.searchRecordings).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockElectronAPI.searchRecordings).toHaveBeenCalledTimes(1);
        expect(mockElectronAPI.searchRecordings).toHaveBeenCalledWith('first');
      },
      { timeout: 600 }
    );
  });

  it('should navigate to recording when clicked', async () => {
    renderList();

    await waitFor(() => {
      expect(screen.getByText('First Recording')).toBeInTheDocument();
    });

    const firstRecording = screen.getByText('First Recording');
    const recordingItem = firstRecording.closest('.recording-item');
    if (recordingItem) {
      fireEvent.click(recordingItem);
    }

    expect(mockOnNavigateToRecording).toHaveBeenCalledWith('rec-1');
  });

  it('should delete recording when delete button clicked', async () => {
    mockElectronAPI.deleteRecording.mockResolvedValue(undefined);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('First Recording')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    const firstDeleteButton = deleteButtons[0];
    if (firstDeleteButton) {
      fireEvent.click(firstDeleteButton);
    }

    // Should show confirm modal
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      expect(screen.getByText('Delete Recording')).toBeInTheDocument();
    });

    // Click confirm button
    const confirmButton = screen.getByTestId('confirm-btn');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockElectronAPI.deleteRecording).toHaveBeenCalledWith('rec-1');
      expect(mockElectronAPI.getAllRecordings).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });

  it('should cancel deletion when user cancels confirm dialog', async () => {
    renderList();

    await waitFor(() => {
      expect(screen.getByText('First Recording')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    const firstDeleteButton = deleteButtons[0];
    if (firstDeleteButton) {
      fireEvent.click(firstDeleteButton);
    }

    // Should show confirm modal
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      expect(screen.getByText('Delete Recording')).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByTestId('cancel-confirm-btn');
    fireEvent.click(cancelButton);

    // Modal should be closed and delete should not be called
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });

    expect(mockElectronAPI.deleteRecording).not.toHaveBeenCalled();
  });

  it('should create new recording when button clicked', async () => {
    mockElectronAPI.newRecording.mockResolvedValue('new-rec-id');
    renderList();

    const newButton = screen.getByText('New Recording');
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(mockElectronAPI.newRecording).toHaveBeenCalled();
      expect(navigateToNewRecording).toHaveBeenCalledWith('new-rec-id');
    });
  });

  it('should format dates correctly', async () => {
    renderList();

    await waitFor(() => {
      // Should show formatted date
      const dateElements = screen.getAllByText((content, element) => {
        return element?.className === 'recording-date' && content.includes('/');
      });
      expect(dateElements).toHaveLength(2);
    });
  });

  it('should display recording titles', async () => {
    renderList();

    await waitFor(() => {
      expect(screen.getByText('First Recording')).toBeInTheDocument();
      expect(screen.getByText('Second Recording')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    // Mock slow loading
    mockElectronAPI.getAllRecordings.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockRecordings), 1000)
        )
    );

    renderList();

    expect(screen.getByText('Loading recordings...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockElectronAPI.getAllRecordings.mockRejectedValue(
      new Error('Failed to load')
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderList();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading recordings:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should display all recordings', async () => {
    renderList();

    await waitFor(() => {
      const recordings = screen.getAllByTestId('recording-item');
      expect(recordings).toHaveLength(2);
      expect(recordings[0]).toHaveTextContent('First Recording');
      expect(recordings[1]).toHaveTextContent('Second Recording');
    });
  });

  it('should disable new recording button when API key is missing', () => {
    const store = createMockStore(''); // Empty API key
    render(
      <Provider store={store}>
        <RecordingsList onNavigateToRecording={mockOnNavigateToRecording} />
      </Provider>
    );

    const newButton = screen.getByText('New Recording');
    expect(newButton).toBeDisabled();
  });

  it('should open settings modal when settings button clicked', () => {
    renderList();

    const settingsButton = screen.getByTestId('settings-button');
    fireEvent.click(settingsButton);

    expect(setShowSettingsModal).toHaveBeenCalledWith(true);
  });
});
