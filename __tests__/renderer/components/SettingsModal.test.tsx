/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import '@testing-library/jest-dom';

import { SettingsModal } from '../../../src/renderer/components/SettingsModal';
import { setStatus } from '../../../src/renderer/store';

// Mock electron API
const mockElectronAPI = {
  saveSettings: jest.fn().mockResolvedValue(undefined),
  getSettings: jest.fn().mockResolvedValue({
    assemblyaiKey: 'test-key',
    autoStart: false,
  }),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
});

// Mock the setStatus action
jest.mock('../../../src/renderer/store', () => ({
  setStatus: jest.fn(() => ({ type: 'ui/setStatus', payload: 'test' })),
}));

// Create mock store
const createMockStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      settings: (
        state = {
          assemblyaiKey: '',
          slackBotToken: '',
          autoStart: false,
        }
      ) => state,
    },
    preloadedState: {
      settings: {
        assemblyaiKey: '',
        slackBotToken: '',
        autoStart: false,
        ...(initialState.settings || {}),
      },
    },
  });
};

describe('SettingsModal', () => {
  let store: ReturnType<typeof createMockStore>;
  const mockOnClose = jest.fn();

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
  });

  const renderModal = (customStore = store) => {
    return render(
      <Provider store={customStore}>
        <SettingsModal onClose={mockOnClose} />
      </Provider>
    );
  };

  it('should render settings modal with all fields', () => {
    renderModal();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(
      screen.getByLabelText('AssemblyAI API Key (required):')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Slack Bot Token (optional):')
    ).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should populate fields from store state', () => {
    const customStore = createMockStore({
      settings: {
        assemblyaiKey: 'stored-api-key',
        slackBotToken: 'stored-slack-token',
        autoStart: true,
      },
    });

    renderModal(customStore);

    const apiKeyInput = screen.getByTestId('assemblyai-key-input');
    const slackTokenInput = screen.getByTestId('slack-token-input');

    expect((apiKeyInput as HTMLInputElement).value).toBe('stored-api-key');
    expect((slackTokenInput as HTMLInputElement).value).toBe(
      'stored-slack-token'
    );
  });

  it('should update assemblyai key on input', () => {
    renderModal();

    const apiKeyInput = screen.getByTestId('assemblyai-key-input');
    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });

    expect(apiKeyInput).toHaveValue('new-api-key');
  });

  it('should update slack token on input', () => {
    renderModal();

    const slackTokenInput = screen.getByTestId('slack-token-input');
    fireEvent.change(slackTokenInput, { target: { value: 'new-slack-token' } });

    expect(slackTokenInput).toHaveValue('new-slack-token');
  });

  it('should disable save and cancel when API key is empty', () => {
    renderModal();

    const saveButton = screen.getByTestId('save-settings-btn');
    const cancelButton = screen.getByTestId('cancel-settings-btn');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should call onClose when cancel is clicked', () => {
    renderModal();

    const apiKeyInput = screen.getByTestId('assemblyai-key-input');
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should save settings when save is clicked', async () => {
    renderModal();

    // Update fields
    const apiKeyInput = screen.getByTestId('assemblyai-key-input');
    const slackTokenInput = screen.getByTestId('slack-token-input');

    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
    fireEvent.change(slackTokenInput, { target: { value: 'new-slack-token' } });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          assemblyaiKey: 'new-api-key',
          slackBotToken: 'new-slack-token',
        })
      );
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle save failure', async () => {
    mockElectronAPI.saveSettings.mockRejectedValueOnce(
      new Error('Save failed')
    );

    renderModal();

    // First add an API key to enable save
    const apiKeyInput = screen.getByTestId('assemblyai-key-input');
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(setStatus).toHaveBeenCalledWith('Error saving settings');
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should handle keyboard shortcuts when API key exists', () => {
    const customStore = createMockStore({
      settings: {
        assemblyaiKey: 'existing-key',
      },
    });
    renderModal(customStore);

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not close modal when API key is empty', () => {
    renderModal();

    // Try to close with escape when API key is empty
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
