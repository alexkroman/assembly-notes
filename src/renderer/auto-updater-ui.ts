let updateNotification: HTMLElement | null = null;

function createUpdateNotification(message: string, type: string = 'info'): void {
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

  if (type === 'info') {
    setTimeout(() => {
      if (updateNotification) {
        updateNotification.remove();
      }
    }, 10000);
  }
}

function createUpdateDialog(info: any): void {
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

  document.getElementById('installUpdate')!.onclick = () => {
    window.electronAPI.installUpdate();
    updateDialogProgress(dialog, 'Downloading update...', 0);
  };

  document.getElementById('skipUpdate')!.onclick = () => {
    dialog.remove();
  };

  (window as any).currentUpdateDialog = dialog;
}

function updateDialogProgress(
  dialog: HTMLElement,
  message: string,
  percent: number | null = null,
  showQuitButton: boolean = false
): void {
  const content = dialog.querySelector('.dialog-content')!;
  const progressText = percent !== null ? ` (${Math.round(percent)}%)` : '';

  if (showQuitButton) {
    content.innerHTML = `
      <h3>Update Ready</h3>
      <p>${message}</p>
      <div class="dialog-buttons">
        <button id="quitAndReopen" class="primary">Quit and Reopen</button>
      </div>
    `;

    document.getElementById('quitAndReopen')!.onclick = () => {
      window.electronAPI.quitAndInstall();
    };
  } else {
    content.innerHTML = `
      <h3>Updating...</h3>
      <p>${message}${progressText}</p>
    `;
  }
}

function handleUpdateAvailable(info: any): void {
  window.logger.info('Update available:', info);
  createUpdateDialog(info);
}

function handleDownloadProgress(progress: any): void {
  const percent = Math.round(progress.percent);
  if ((window as any).currentUpdateDialog) {
    updateDialogProgress(
      (window as any).currentUpdateDialog,
      'Downloading update...',
      percent
    );
  }
}

function handleUpdateDownloaded(info: any): void {
  window.logger.info('Update downloaded:', info);
  if ((window as any).currentUpdateDialog) {
    updateDialogProgress(
      (window as any).currentUpdateDialog,
      'Update ready to install!',
      null,
      true
    );
  }
}

export function initAutoUpdaterUI(): void {
  window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
  window.electronAPI.onDownloadProgress(handleDownloadProgress);
  window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
}

export {
  createUpdateNotification,
  createUpdateDialog,
  handleUpdateAvailable,
  handleDownloadProgress,
  handleUpdateDownloaded,
};