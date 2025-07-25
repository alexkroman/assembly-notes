/**
 * @jest-environment jsdom
 */

describe('AutoUpdaterUI Module', () => {
  let mockElectronAPI;
  let mockLogger;
  let AutoUpdaterUI;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Setup DOM globals
    global.window = window;
    
    // Mock electronAPI
    mockElectronAPI = {
      onUpdateAvailable: jest.fn(),
      onDownloadProgress: jest.fn(),
      onUpdateDownloaded: jest.fn(),
      installUpdate: jest.fn(),
      quitAndInstall: jest.fn(),
    };
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    
    // Set up window globals
    window.electronAPI = mockElectronAPI;
    window.logger = mockLogger;
    window.currentUpdateDialog = null;
    
    // Clear module cache to ensure fresh load for coverage
    delete require.cache[require.resolve('../src/renderer/auto-updater-ui.js')];
    
    // Load the module directly (this will execute the IIFE and assign to window.AutoUpdaterUI)
    require('../src/renderer/auto-updater-ui.js');
    AutoUpdaterUI = window.AutoUpdaterUI;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('createUpdateNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create an info notification', () => {
      AutoUpdaterUI.createUpdateNotification('Test message', 'info');
      
      const notification = document.querySelector('.update-notification');
      expect(notification).toBeTruthy();
      expect(notification.classList.contains('info')).toBe(true);
      expect(notification.textContent).toContain('Test message');
    });

    it('should create a success notification', () => {
      AutoUpdaterUI.createUpdateNotification('Success message', 'success');
      
      const notification = document.querySelector('.update-notification');
      expect(notification).toBeTruthy();
      expect(notification.classList.contains('success')).toBe(true);
      expect(notification.textContent).toContain('Success message');
    });

    it('should create an error notification', () => {
      AutoUpdaterUI.createUpdateNotification('Error message', 'error');
      
      const notification = document.querySelector('.update-notification');
      expect(notification).toBeTruthy();
      expect(notification.classList.contains('error')).toBe(true);
      expect(notification.textContent).toContain('Error message');
    });

    it('should remove existing notification before creating new one', () => {
      AutoUpdaterUI.createUpdateNotification('First message');
      AutoUpdaterUI.createUpdateNotification('Second message');
      
      const notifications = document.querySelectorAll('.update-notification');
      expect(notifications.length).toBe(1);
      expect(notifications[0].textContent).toContain('Second message');
    });

    it('should auto-remove info notifications after 10 seconds', () => {
      AutoUpdaterUI.createUpdateNotification('Auto-remove message', 'info');
      
      let notification = document.querySelector('.update-notification');
      expect(notification).toBeTruthy();
      
      jest.advanceTimersByTime(10000);
      
      notification = document.querySelector('.update-notification');
      expect(notification).toBeFalsy();
    });

    it('should not auto-remove non-info notifications', () => {
      AutoUpdaterUI.createUpdateNotification('Persistent message', 'error');
      
      jest.advanceTimersByTime(10000);
      
      const notification = document.querySelector('.update-notification');
      expect(notification).toBeTruthy();
    });

    it('should handle close button click', () => {
      AutoUpdaterUI.createUpdateNotification('Test message');
      
      const closeButton = document.querySelector('.close-btn');
      expect(closeButton).toBeTruthy();
      
      closeButton.click();
      
      const notification = document.querySelector('.update-notification');
      expect(notification).toBeFalsy();
    });

    it('should handle timeout when notification is already removed', () => {
      AutoUpdaterUI.createUpdateNotification('Test message', 'info');
      
      // Manually remove the notification before timeout
      const notification = document.querySelector('.update-notification');
      notification.remove();
      
      // Advance timer to trigger the timeout callback
      jest.advanceTimersByTime(10000);
      
      // Should not throw error even though notification is already removed
      expect(document.querySelector('.update-notification')).toBeFalsy();
    });
  });

  describe('createUpdateDialog', () => {
    const mockUpdateInfo = {
      version: '1.2.3',
      releaseDate: '2023-01-01',
    };

    it('should create update dialog with correct content', () => {
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      
      const dialog = document.querySelector('.update-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('Update Available');
      expect(dialog.textContent).toContain('1.2.3');
      
      const installButton = document.getElementById('installUpdate');
      const skipButton = document.getElementById('skipUpdate');
      expect(installButton).toBeTruthy();
      expect(skipButton).toBeTruthy();
    });

    it('should handle install button click', () => {
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      
      const installButton = document.getElementById('installUpdate');
      installButton.click();
      
      expect(mockElectronAPI.installUpdate).toHaveBeenCalledTimes(1);
      
      // Check if dialog content changed to show progress
      const dialog = document.querySelector('.update-dialog');
      expect(dialog.textContent).toContain('Updating...');
      expect(dialog.textContent).toContain('Downloading update...');
    });

    it('should handle skip button click', () => {
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      
      const skipButton = document.getElementById('skipUpdate');
      skipButton.click();
      
      const dialog = document.querySelector('.update-dialog');
      expect(dialog).toBeFalsy();
    });

    it('should store dialog reference in window.currentUpdateDialog', () => {
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      
      expect(window.currentUpdateDialog).toBeTruthy();
      expect(window.currentUpdateDialog.classList.contains('update-dialog')).toBe(true);
    });
  });

  describe('dialog progress updates', () => {
    const mockUpdateInfo = {
      version: '1.2.3',
      releaseDate: '2023-01-01',
    };

    it('should update dialog progress when install button is clicked', () => {
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      
      const installButton = document.getElementById('installUpdate');
      installButton.click();
      
      const dialog = document.querySelector('.update-dialog');
      const content = dialog.querySelector('.dialog-content');
      expect(content.textContent).toContain('Updating...');
      expect(content.textContent).toContain('Downloading update...');
    });

    it('should update dialog progress with percentage during download', () => {
      // Create dialog first
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      const installButton = document.getElementById('installUpdate');
      installButton.click();
      
      // Simulate download progress
      const mockProgress = { percent: 75.5 };
      AutoUpdaterUI.handleDownloadProgress(mockProgress);
      
      const dialog = document.querySelector('.update-dialog');
      const content = dialog.querySelector('.dialog-content');
      expect(content.textContent).toContain('Downloading update... (76%)');
    });

    it('should show quit button when update is downloaded', () => {
      // Create dialog and start download
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      const installButton = document.getElementById('installUpdate');
      installButton.click();
      
      // Simulate update downloaded
      AutoUpdaterUI.handleUpdateDownloaded(mockUpdateInfo);
      
      const dialog = document.querySelector('.update-dialog');
      const content = dialog.querySelector('.dialog-content');
      expect(content.textContent).toContain('Update Ready');
      expect(content.textContent).toContain('Update ready to install!');
      
      const quitButton = document.getElementById('quitAndReopen');
      expect(quitButton).toBeTruthy();
    });

    it('should handle quit and reopen button click', () => {
      // Create dialog, start download, and complete download
      AutoUpdaterUI.createUpdateDialog(mockUpdateInfo);
      const installButton = document.getElementById('installUpdate');
      installButton.click();
      AutoUpdaterUI.handleUpdateDownloaded(mockUpdateInfo);
      
      const quitButton = document.getElementById('quitAndReopen');
      quitButton.click();
      
      expect(mockElectronAPI.quitAndInstall).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleUpdateAvailable', () => {
    const mockUpdateInfo = {
      version: '1.2.3',
      releaseDate: '2023-01-01',
    };

    it('should log update info and create dialog', () => {
      AutoUpdaterUI.handleUpdateAvailable(mockUpdateInfo);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Update available:', mockUpdateInfo);
      
      const dialog = document.querySelector('.update-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('1.2.3');
    });
  });

  describe('handleDownloadProgress', () => {
    const mockProgress = {
      percent: 75.5,
      bytesPerSecond: 1024,
      transferred: 750,
      total: 1000,
    };

    it('should update dialog progress when dialog exists', () => {
      // Create a dialog first
      const dialog = document.createElement('div');
      dialog.className = 'update-dialog';
      dialog.innerHTML = `
        <div class="dialog-content">
          <h3>Original</h3>
          <p>Original</p>
        </div>
      `;
      document.body.appendChild(dialog);
      window.currentUpdateDialog = dialog;
      
      AutoUpdaterUI.handleDownloadProgress(mockProgress);
      
      const content = dialog.querySelector('.dialog-content');
      expect(content.textContent).toContain('Downloading update... (76%)');
    });

    it('should handle missing dialog gracefully', () => {
      window.currentUpdateDialog = null;
      
      expect(() => {
        AutoUpdaterUI.handleDownloadProgress(mockProgress);
      }).not.toThrow();
    });
  });

  describe('handleUpdateDownloaded', () => {
    const mockUpdateInfo = {
      version: '1.2.3',
      releaseDate: '2023-01-01',
    };

    it('should log update info and update dialog with quit button', () => {
      // Create a dialog first
      const dialog = document.createElement('div');
      dialog.className = 'update-dialog';
      dialog.innerHTML = `
        <div class="dialog-content">
          <h3>Original</h3>
          <p>Original</p>
        </div>
      `;
      document.body.appendChild(dialog);
      window.currentUpdateDialog = dialog;
      
      AutoUpdaterUI.handleUpdateDownloaded(mockUpdateInfo);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Update downloaded:', mockUpdateInfo);
      
      const content = dialog.querySelector('.dialog-content');
      expect(content.textContent).toContain('Update Ready');
      expect(content.textContent).toContain('Update ready to install!');
      
      const quitButton = document.getElementById('quitAndReopen');
      expect(quitButton).toBeTruthy();
    });

    it('should handle missing dialog gracefully', () => {
      window.currentUpdateDialog = null;
      
      expect(() => {
        AutoUpdaterUI.handleUpdateDownloaded(mockUpdateInfo);
      }).not.toThrow();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Update downloaded:', mockUpdateInfo);
    });
  });

  describe('initAutoUpdaterUI', () => {
    it('should set up event listeners', () => {
      AutoUpdaterUI.initAutoUpdaterUI();
      
      expect(mockElectronAPI.onUpdateAvailable).toHaveBeenCalledWith(
        AutoUpdaterUI.handleUpdateAvailable
      );
      expect(mockElectronAPI.onDownloadProgress).toHaveBeenCalledWith(
        AutoUpdaterUI.handleDownloadProgress
      );
      expect(mockElectronAPI.onUpdateDownloaded).toHaveBeenCalledWith(
        AutoUpdaterUI.handleUpdateDownloaded
      );
    });
  });

  describe('module exports', () => {
    it('should export all required functions', () => {
      expect(typeof AutoUpdaterUI.initAutoUpdaterUI).toBe('function');
      expect(typeof AutoUpdaterUI.createUpdateNotification).toBe('function');
      expect(typeof AutoUpdaterUI.createUpdateDialog).toBe('function');
      expect(typeof AutoUpdaterUI.handleUpdateAvailable).toBe('function');
      expect(typeof AutoUpdaterUI.handleDownloadProgress).toBe('function');
      expect(typeof AutoUpdaterUI.handleUpdateDownloaded).toBe('function');
    });
  });
});