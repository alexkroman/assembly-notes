import React from 'react';
import { createRoot } from 'react-dom/client';

import type { UpdateInfo, DownloadProgress } from '../types/index.js';
import { UpdateModal } from './components/UpdateModal.js';

let updateModalRoot: ReturnType<typeof createRoot> | null = null;
let currentUpdateInfo: UpdateInfo | null = null;
let downloadProgress: number | null = null;
let isDownloading = false;
let isReadyToInstall = false;
let isRestarting = false;
let restartError: string | null = null;

function renderUpdateModal(isOpen: boolean): void {
  if (!updateModalRoot) {
    const container = document.createElement('div');
    container.id = 'update-modal-root';
    document.body.appendChild(container);
    updateModalRoot = createRoot(container);
  }

  const handleClose = () => {
    renderUpdateModal(false);
  };

  const handleInstall = () => {
    void window.electronAPI.installUpdate();
    isDownloading = true;
    downloadProgress = 0;
    renderUpdateModal(true);
  };

  const handleQuitAndInstall = async () => {
    try {
      isRestarting = true;
      restartError = null;
      renderUpdateModal(true); // Re-render to show "Restarting..." state
      await window.electronAPI.quitAndInstall();
    } catch (error) {
      window.logger.error('Failed to quit and install:', error);
      isRestarting = false;
      restartError = 'Failed to restart. Please try again or restart manually.';
      renderUpdateModal(true); // Re-render to show error state
    }
  };

  updateModalRoot.render(
    React.createElement(UpdateModal, {
      isOpen,
      onClose: handleClose,
      updateInfo: currentUpdateInfo,
      onInstall: handleInstall,
      downloadProgress,
      isDownloading,
      isReadyToInstall,
      onQuitAndInstall: handleQuitAndInstall,
      isRestarting,
      restartError,
    })
  );
}

function handleUpdateAvailable(info: UpdateInfo): void {
  currentUpdateInfo = info;
  isDownloading = false;
  isReadyToInstall = false;
  downloadProgress = null;
  isRestarting = false;
  restartError = null;
  renderUpdateModal(true);
}

function handleDownloadProgress(progress: Partial<DownloadProgress>): void {
  downloadProgress = Math.round(progress.percent ?? 0);
  renderUpdateModal(true);
}

function handleUpdateDownloaded(_info: UpdateInfo): void {
  isDownloading = false;
  isReadyToInstall = true;
  downloadProgress = null;
  renderUpdateModal(true);
}

function handleUpdateError(error: string): void {
  window.logger.error('Update error:', error);

  // If error during download, show error in modal
  if (isDownloading) {
    isDownloading = false;
    downloadProgress = null;
    // Check for common error types and provide user-friendly messages
    if (error.includes('sha512 checksum mismatch')) {
      restartError = 'Download verification failed. Please try again.';
    } else if (error.includes('net::ERR_')) {
      restartError =
        'Network error during download. Please check your connection and try again.';
    } else {
      restartError = `Update failed: ${error}`;
    }
    renderUpdateModal(true);
  }
}

export function initAutoUpdaterUI(): void {
  window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
  window.electronAPI.onDownloadProgress(handleDownloadProgress);
  window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
  window.electronAPI.onUpdateError(handleUpdateError);
}
