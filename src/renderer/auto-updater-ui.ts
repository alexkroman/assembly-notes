import type { UpdateInfo, DownloadProgress } from '../types/index.js';

let updateNotification: HTMLElement | null = null;
let notificationTimeout: NodeJS.Timeout | null = null;

function createUpdateNotification(message: string, type = 'info'): void {
  // Clear any existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }

  if (updateNotification) {
    updateNotification.remove();
  }

  updateNotification = document.createElement('div');
  updateNotification.className = `update-notification ${type}`;

  // Create the notification content safely
  const content = document.createElement('div');
  content.className = 'notification-content';

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message; // Safe: uses textContent instead of innerHTML

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    if (updateNotification) {
      updateNotification.remove();
      updateNotification = null;
    }
  };

  content.appendChild(messageSpan);
  content.appendChild(closeBtn);
  updateNotification.appendChild(content);

  document.body.appendChild(updateNotification);

  if (type === 'info') {
    notificationTimeout = setTimeout(() => {
      if (updateNotification) {
        updateNotification.remove();
        updateNotification = null;
      }
      notificationTimeout = null;
    }, 10000);
  }
}

function createUpdateDialog(info: UpdateInfo): void {
  const dialog = document.createElement('div');
  dialog.className = 'modal-overlay';

  // Create dialog content safely
  const content = document.createElement('div');
  content.className = 'modal-content';

  const header = document.createElement('div');
  header.className = 'modal-header';

  const title = document.createElement('h2');
  title.textContent = 'Update Available';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.id = 'closeUpdate';
  closeBtn.textContent = '×';

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';

  const message = document.createElement('p');
  message.textContent = `A new version (${String(info.version)}) is available. Would you like to download and install it?`;

  body.appendChild(message);

  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const skipBtn = document.createElement('button');
  skipBtn.id = 'skipUpdate';
  skipBtn.className = 'btn-secondary';
  skipBtn.textContent = 'Skip';

  const installBtn = document.createElement('button');
  installBtn.id = 'installUpdate';
  installBtn.className = 'btn-primary';
  installBtn.textContent = 'Install Update';

  footer.appendChild(skipBtn);
  footer.appendChild(installBtn);

  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  dialog.appendChild(content);

  document.body.appendChild(dialog);

  const installBtnElement = document.getElementById('installUpdate');
  const skipBtnElement = document.getElementById('skipUpdate');
  const closeBtnElement = document.getElementById('closeUpdate');

  if (installBtnElement) {
    installBtnElement.onclick = () => {
      void window.electronAPI.installUpdate();
      updateDialogProgress(dialog, 'Downloading update...', 0);
    };
  }

  if (skipBtnElement) {
    skipBtnElement.onclick = () => {
      dialog.remove();
    };
  }

  if (closeBtnElement) {
    closeBtnElement.onclick = () => {
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
  const content = dialog.querySelector('.modal-content');
  if (!content) return;

  // Clear existing content
  content.innerHTML = '';

  const progressText =
    percent !== null ? ` (${String(Math.round(percent))}%)` : '';

  if (showQuitButton) {
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.textContent = 'Update Ready';
    header.appendChild(title);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const messageP = document.createElement('p');
    messageP.textContent = message;
    body.appendChild(messageP);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const quitBtn = document.createElement('button');
    quitBtn.id = 'quitAndReopen';
    quitBtn.className = 'btn-primary';
    quitBtn.textContent = 'Quit and Reopen';

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
        body.appendChild(errorMsg);
      }
    };

    footer.appendChild(quitBtn);
    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
  } else {
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.textContent = 'Updating...';
    header.appendChild(title);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const messageP = document.createElement('p');
    messageP.textContent = `${message}${progressText}`;
    body.appendChild(messageP);

    content.appendChild(header);
    content.appendChild(body);
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
