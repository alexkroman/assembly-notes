/**
 * @jest-environment jsdom
 */
/* eslint-disable import/order */
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import '@testing-library/jest-dom';
import { SettingsModal } from '../../../src/renderer/components/SettingsModal';

// Mock the setStatus action
jest.mock('../../../src/renderer/store', () => ({
  setStatus: jest.fn(() => ({ type: 'ui/setStatus', payload: 'test' })),
}));

// Mock RTK Query hooks
jest.mock('../../../src/renderer/store/api/apiSlice', () => ({
  useGetSettingsQuery: jest.fn(),
  useUpdateSettingsMutation: jest.fn(),
}));

// Import the mocked hooks
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from '../../../src/renderer/store/api/apiSlice';

// Mock electron API
const mockElectronAPI = {
  saveSettings: jest.fn().mockResolvedValue(undefined),
  getSettings: jest.fn().mockResolvedValue({
    assemblyaiKey: 'test-key',
    autoStart: false,
  }),
  onSlackOAuthSuccess: jest.fn(),
  onSlackOAuthError: jest.fn(),
  slackOAuthInitiate: jest.fn().mockResolvedValue(undefined),
  slackOAuthRemoveInstallation: jest.fn().mockResolvedValue(undefined),
  slackOAuthRefreshChannels: jest.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
});

// Create mock store
const createMockStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      settings: (
        state = {
          assemblyaiKey: '',
          autoStart: false,
          slackInstallation: null,
          selectedChannelId: '',
          slackChannels: '',
        }
      ) => state,
    },
    preloadedState: {
      settings: {
        assemblyaiKey: '',
        autoStart: false,
        slackInstallation: null,
        selectedChannelId: '',
        slackChannels: '',
        ...(initialState.settings || {}),
      },
    },
  });
};

describe('SettingsModal', () => {
  let store: ReturnType<typeof createMockStore>;
  const mockOnClose = jest.fn();

  const mockUseGetSettingsQuery = useGetSettingsQuery as jest.MockedFunction<
    typeof useGetSettingsQuery
  >;
  const mockUseUpdateSettingsMutation =
    useUpdateSettingsMutation as jest.MockedFunction<
      typeof useUpdateSettingsMutation
    >;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();

    // Default RTK Query mock implementations
    mockUseGetSettingsQuery.mockReturnValue({
      data: {
        assemblyaiKey: 'test-key',
        autoStart: false,
        slackInstallation: null,
        slackChannels: '',
        summaryPrompt: 'Test prompt',
        prompts: [],
      },
      isLoading: false,
      error: null,
    } as any);

    mockUseUpdateSettingsMutation.mockReturnValue([
      jest.fn().mockResolvedValue({ data: true }),
      { isLoading: false },
    ] as any);
  });

  const renderModal = (customStore = store) => {
    return render(
      <Provider store={customStore}>
        <SettingsModal onClose={mockOnClose} />
      </Provider>
    );
  };

  it('should render settings modal', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue('test-key')).toBeInTheDocument();
    });
  });

  it('should disable buttons when API key is empty', async () => {
    mockUseGetSettingsQuery.mockReturnValue({
      data: {
        assemblyaiKey: '',
        autoStart: false,
        slackInstallation: null,
        slackChannels: '',
        summaryPrompt: 'Test prompt',
        prompts: [],
      },
      isLoading: false,
      error: null,
    } as any);

    renderModal();

    await waitFor(() => {
      const saveButton = screen.getByTestId('save-settings-btn');
      const cancelButton = screen.getByTestId('cancel-settings-btn');

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });
  });

  it('should show loading state', () => {
    mockUseGetSettingsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderModal();

    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });
});
