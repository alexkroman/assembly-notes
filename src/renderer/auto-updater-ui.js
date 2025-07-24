const log = window.logger;

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
    dialog.remove();
    createUpdateNotification('Update will be installed on restart', 'success');
  };

  // Handle skip button click
  document.getElementById('skipUpdate').onclick = () => {
    dialog.remove();
  };
}

/**
 * Handle update available event
 * @param {object} info - Update information
 */
function handleUpdateAvailable(info) {
  log.info('Update available:', info);
  createUpdateDialog(info);
}

/**
 * Handle download progress event
 * @param {object} progress - Download progress information
 */
function handleDownloadProgress(progress) {
  const percent = Math.round(progress.percent);
  createUpdateNotification(`Downloading update: ${percent}%`, 'info');
}

/**
 * Handle update downloaded event
 * @param {object} info - Update information
 */
function handleUpdateDownloaded(info) {
  log.info('Update downloaded:', info);
  createUpdateNotification('Update downloaded! Restart to install.', 'success');
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
window.AutoUpdaterUI = {
  initAutoUpdaterUI,
  createUpdateNotification,
  createUpdateDialog,
  handleUpdateAvailable,
  handleDownloadProgress,
  handleUpdateDownloaded,
};
