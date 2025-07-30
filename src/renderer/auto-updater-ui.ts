import type { UpdateInfo, DownloadProgress } from '../types/index.js';

let updateNotification: HTMLElement | null = null;

function createUpdateNotification(message: string, type = 'info'): void {
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

function createUpdateDialog(info: UpdateInfo): void {
  const dialog = document.createElement('div');
  dialog.className = 'update-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <h3>Update Available</h3>
      <p>A new version (${String(info.version)}) is available. Would you like to download and install it?</p>
      <div class="dialog-buttons">
        <button id="installUpdate" class="primary">Install Update</button>
        <button id="skipUpdate">Skip</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  const installBtn = document.getElementById('installUpdate');
  const skipBtn = document.getElementById('skipUpdate');

  if (installBtn) {
    installBtn.onclick = () => {
      void window.electronAPI.installUpdate();
      updateDialogProgress(dialog, 'Downloading update...', 0);
    };
  }

  if (skipBtn) {
    skipBtn.onclick = () => {
      dialog.remove();
    };
  }

  (
    window as Window & { currentUpdateDialog?: HTMLElement }
  ).currentUpdateDialog = dialog;
}

function updateDialogProgress(
  dialog: HTMLElement,
  message: string,
  percent: number | null = null,
  showQuitButton = false
): void {
  const content = dialog.querySelector('.dialog-content');
  if (!content) return;
  const progressText =
    percent !== null ? ` (${String(Math.round(percent))}%)` : '';

  if (showQuitButton) {
    content.innerHTML = `
      <h3>Update Ready</h3>
      <p>${message}</p>
      <div class="dialog-buttons">
        <button id="quitAndReopen" class="primary">Quit and Reopen</button>
      </div>
    `;

    const quitBtn = document.getElementById(
      'quitAndReopen'
    ) as HTMLButtonElement | null;
    if (quitBtn) {
      quitBtn.onclick = async () => {
        try {
          quitBtn.textContent = 'Restarting...';
          quitBtn.disabled = true;
          await window.electronAPI.quitAndInstall();
        } catch (error) {
          window.logger.error('Failed to quit and install:', error);
          quitBtn.textContent = 'Retry';
          quitBtn.disabled = false;

          // Show error message
          const errorMsg = document.createElement('p');
          errorMsg.style.color = 'red';
          errorMsg.textContent =
            'Failed to restart. Please try again or restart manually.';
          content.appendChild(errorMsg);
        }
      };
    }
  } else {
    content.innerHTML = `
      <h3>Updating...</h3>
      <p>${message}${progressText}</p>
    `;
  }
}

function handleUpdateAvailable(info: UpdateInfo): void {
  createUpdateDialog(info);
}

function handleDownloadProgress(progress: Partial<DownloadProgress>): void {
  const percent = Math.round(Number(progress.percent ?? 0));
  const dialog = (
    window as Window & { currentUpdateDialog?: HTMLElement | null }
  ).currentUpdateDialog;
  if (dialog) {
    updateDialogProgress(dialog, 'Downloading update...', percent);
  }
}

function handleUpdateDownloaded(_info: UpdateInfo): void {
  const dialog = (
    window as Window & { currentUpdateDialog?: HTMLElement | null }
  ).currentUpdateDialog;
  if (dialog) {
    updateDialogProgress(dialog, 'Update ready to install!', null, true);
  }
}

export function initAutoUpdaterUI(): void {
  window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
  window.electronAPI.onDownloadProgress(handleDownloadProgress);
  window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
}

declare global {
  interface Window {
    AutoUpdaterUI: {
      initAutoUpdaterUI: () => void;
      createUpdateNotification: (message: string, type?: string) => void;
      createUpdateDialog: (updateInfo: UpdateInfo) => void;
      handleUpdateAvailable: (updateInfo: UpdateInfo) => void;
      handleDownloadProgress: (progress: Partial<DownloadProgress>) => void;
      handleUpdateDownloaded: (updateInfo: UpdateInfo) => void;
    };
  }
}

(window as Window & { AutoUpdaterUI: Window['AutoUpdaterUI'] }).AutoUpdaterUI =
  {
    initAutoUpdaterUI,
    createUpdateNotification,
    createUpdateDialog,
    handleUpdateAvailable,
    handleDownloadProgress,
    handleUpdateDownloaded,
  };

export {
  createUpdateNotification,
  createUpdateDialog,
  handleUpdateAvailable,
  handleDownloadProgress,
  handleUpdateDownloaded,
};
