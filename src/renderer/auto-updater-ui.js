window.AutoUpdaterUI = (function () {
  // Update notification elements
  let updateNotification = null;

  /**
   * Create and display an update notification
   * @param {string} message - The message to display
   * @param {string} type - The notification type ('info', 'success', 'error')
   */
  function createUpdateNotification(message, type = 'info') {
    // Remove existing notification
    if (updateNotification) {
      updateNotification.remove();
    }

    updateNotification = document.createElement('div');
    updateNotification.className = `update-notification ${type}`;
    updateNotification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    document.body.appendChild(updateNotification);

    // Auto-remove info notifications after 10 seconds
    if (type === 'info') {
      setTimeout(() => {
        if (updateNotification) {
          updateNotification.remove();
        }
      }, 10000);
    }
  }

  /**
   * Create and display an update dialog asking user to install
   * @param {object} info - Update information from electron-updater
   */
  function createUpdateDialog(info) {
    const dialog = document.createElement('div');
    dialog.className = 'update-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Update Available</h3>
        <p>A new version (${info.version}) is available. Would you like to download and install it?</p>
        <div class="dialog-buttons">
          <button id="installUpdate" class="primary">Install Update</button>
          <button id="skipUpdate">Skip</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Handle install button click
    document.getElementById('installUpdate').onclick = () => {
      window.electronAPI.installUpdate();
      updateDialogProgress(dialog, 'Downloading update...', 0);
    };

    // Handle skip button click
    document.getElementById('skipUpdate').onclick = () => {
      dialog.remove();
    };

    // Store dialog reference for later updates
    window.currentUpdateDialog = dialog;
  }

  /**
   * Update the dialog to show progress
   * @param {HTMLElement} dialog - The dialog element
   * @param {string} message - Progress message
   * @param {number} percent - Progress percentage (optional)
   * @param {boolean} showQuitButton - Whether to show quit and reopen button
   */
  function updateDialogProgress(
    dialog,
    message,
    percent = null,
    showQuitButton = false
  ) {
    const content = dialog.querySelector('.dialog-content');
    const progressText = percent !== null ? ` (${Math.round(percent)}%)` : '';

    if (showQuitButton) {
      content.innerHTML = `
        <h3>Update Ready</h3>
        <p>${message}</p>
        <div class="dialog-buttons">
          <button id="quitAndReopen" class="primary">Quit and Reopen</button>
        </div>
      `;

      document.getElementById('quitAndReopen').onclick = () => {
        window.electronAPI.quitAndInstall();
      };
    } else {
      content.innerHTML = `
        <h3>Updating...</h3>
        <p>${message}${progressText}</p>
      `;
    }
  }

  /**
   * Handle update available event
   * @param {object} info - Update information
   */
  function handleUpdateAvailable(info) {
    window.logger.info('Update available:', info);
    createUpdateDialog(info);
  }

  /**
   * Handle download progress event
   * @param {object} progress - Download progress information
   */
  function handleDownloadProgress(progress) {
    const percent = Math.round(progress.percent);
    if (window.currentUpdateDialog) {
      updateDialogProgress(
        window.currentUpdateDialog,
        'Downloading update...',
        percent
      );
    }
  }

  /**
   * Handle update downloaded event
   * @param {object} info - Update information
   */
  function handleUpdateDownloaded(info) {
    window.logger.info('Update downloaded:', info);
    if (window.currentUpdateDialog) {
      updateDialogProgress(
        window.currentUpdateDialog,
        'Update ready to install!',
        null,
        true
      );
    }
  }

  /**
   * Initialize auto-updater UI event listeners
   */
  function initAutoUpdaterUI() {
    // Set up event listeners for auto-updater events
    window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
    window.electronAPI.onDownloadProgress(handleDownloadProgress);
    window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
  }

  // Export functions for use in other modules
  return {
    initAutoUpdaterUI,
    createUpdateNotification,
    createUpdateDialog,
    handleUpdateAvailable,
    handleDownloadProgress,
    handleUpdateDownloaded,
  };
})();
