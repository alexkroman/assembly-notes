import React from 'react';
import { createRoot } from 'react-dom/client';

import type { UpdateInfo, DownloadProgress } from '../types/index.js';
import { UpdateModal } from './components/UpdateModal.js';

let updateModalRoot: ReturnType<typeof createRoot> | null = null;
let currentUpdateInfo: UpdateInfo | null = null;
let downloadProgress: number | null = null;
let isDownloading = false;
let isReadyToInstall = false;

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

  const handleQuitAndInstall = () => {
    void window.electronAPI.quitAndInstall();
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
    })
  );
}

function handleUpdateAvailable(info: UpdateInfo): void {
  currentUpdateInfo = info;
  isDownloading = false;
  isReadyToInstall = false;
  downloadProgress = null;
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

export function initAutoUpdaterUI(): void {
  window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
  window.electronAPI.onDownloadProgress(handleDownloadProgress);
  window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
}
