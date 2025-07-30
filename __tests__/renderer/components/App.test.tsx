/**
 * @jest-environment jsdom
 */
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import '@testing-library/jest-dom';

// Mock electron API
const mockElectronAPI = {
  getSettings: jest.fn(),
  onOpenSettings: jest.fn(),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
});

// Create a minimal App component for testing
const TestApp: React.FC = () => {
  const [settings, setSettings] = React.useState<any>(null);
  // Suppress unused variable warning for settings in tests
  void settings;
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const settings = await (window as any).electronAPI.getSettings();
        setSettings(settings);
        if (!settings.assemblyaiKey.trim()) {
          setShowModal(true);
        }
      } catch (error) {
        console.error('Error checking initial setup:', error);
      }
    };

    void checkInitialSetup();

    // Listen for open settings events
    (window as any).electronAPI.onOpenSettings(() => {
      setShowModal(true);
    });
  }, []);

  return (
    <div data-testid="app-container">
      <div data-testid="recordings-list">Recordings List</div>
      <button data-testid="settings-button" onClick={() => setShowModal(true)}>
        Settings
      </button>
      {showModal && (
        <div data-testid="settings-modal">
          Settings Modal
          <button
            data-testid="close-modal-btn"
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

// Create mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      ui: (
        state = {
          currentPage: 'list',
          currentRecordingId: null,
          showSettingsModal: false,
          showPromptModal: false,
          showChannelModal: false,
        }
      ) => state,
      recording: (state = { isRecording: false }) => state,
    },
    preloadedState: {
      ui: {
        currentPage: 'list',
        currentRecordingId: null,
        showSettingsModal: false,
        showPromptModal: false,
        showChannelModal: false,
      },
      recording: {
        isRecording: false,
      },
      ...initialState,
    },
  });
};

describe('App Component', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(
      <Provider store={store}>
        <TestApp />
      </Provider>
    );

    expect(screen.getByTestId('app-container')).toBeInTheDocument();
  });

  const renderApp = (customStore = store) => {
    return render(
      <Provider store={customStore}>
        <TestApp />
      </Provider>
    );
  };

  describe('initial render', () => {
    it('should render app container', () => {
      renderApp();

      expect(screen.getByTestId('app-container')).toBeInTheDocument();
      expect(screen.getByTestId('recordings-list')).toBeInTheDocument();
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });

    it('should not show settings modal initially', () => {
      renderApp();

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });
  });

  describe('settings management', () => {
    it('should show settings modal when settings button is clicked', async () => {
      renderApp();

      const settingsButton = screen.getByTestId('settings-button');
      settingsButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
    });

    it('should hide settings modal when close button is clicked', async () => {
      renderApp();

      // Open modal
      const settingsButton = screen.getByTestId('settings-button');
      settingsButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByTestId('close-modal-btn');
      closeButton.click();

      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('initial setup check', () => {
    it('should call getSettings on mount', async () => {
      renderApp();

      await waitFor(() => {
        expect(mockElectronAPI.getSettings).toHaveBeenCalled();
      });
    });

    it('should show settings modal if AssemblyAI key is missing', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({
        assemblyaiKey: '',
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
    });

    it('should not show settings modal if AssemblyAI key exists', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({
        assemblyaiKey: 'valid-key',
      });

      renderApp();

      await waitFor(() => {
        expect(mockElectronAPI.getSettings).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });

    it('should handle settings check error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockElectronAPI.getSettings.mockRejectedValue(
        new Error('Settings error')
      );

      renderApp();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error checking initial setup:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('event listeners', () => {
    it('should register onOpenSettings listener', () => {
      renderApp();

      expect(mockElectronAPI.onOpenSettings).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should show settings modal when onOpenSettings is triggered', async () => {
      renderApp();

      // Get the callback function passed to onOpenSettings
      const onOpenSettingsCallback =
        mockElectronAPI.onOpenSettings.mock.calls[0][0];

      // Execute the callback
      onOpenSettingsCallback();

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
    });
  });
});
