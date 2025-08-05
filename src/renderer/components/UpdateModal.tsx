import React from 'react';

import { Modal } from './Modal.js';
import type { UpdateInfo } from '../../types/index.js';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  onInstall: () => void;
  downloadProgress: number | null;
  isDownloading: boolean;
  isReadyToInstall: boolean;
  onQuitAndInstall: () => void | Promise<void>;
  isRestarting?: boolean;
  restartError?: string | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onInstall,
  downloadProgress,
  isDownloading,
  isReadyToInstall,
  onQuitAndInstall,
  isRestarting = false,
  restartError = null,
}) => {
  const getTitle = () => {
    if (isReadyToInstall) return 'Update Ready';
    if (isDownloading) return 'Updating...';
    return 'Update Available';
  };

  const getContent = () => {
    if (isReadyToInstall) {
      return (
        <>
          <p className="text-white/[0.85] text-xs">Update ready to install!</p>
          {restartError && (
            <p className="text-[#dc3545] text-xs mt-2">{restartError}</p>
          )}
        </>
      );
    }

    if (isDownloading) {
      const progressText =
        downloadProgress !== null
          ? ` (${String(Math.round(downloadProgress))}%)`
          : '';
      return (
        <p className="text-white/[0.85] text-xs">
          Downloading update...{progressText}
        </p>
      );
    }

    return (
      <p className="text-white/[0.85] text-xs">
        A new version ({updateInfo?.version}) is available. Would you like to
        download and install it?
      </p>
    );
  };

  const getFooter = () => {
    if (isReadyToInstall) {
      return (
        <button
          className="btn-primary"
          onClick={() => void onQuitAndInstall()}
          disabled={isRestarting}
        >
          {isRestarting ? 'Restarting...' : 'Quit and Reopen'}
        </button>
      );
    }

    if (isDownloading) {
      return null;
    }

    return (
      <>
        <button className="btn-secondary" onClick={onClose}>
          Skip
        </button>
        <button className="btn-primary" onClick={onInstall}>
          Install Update
        </button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      footer={getFooter()}
      closeDisabled={isDownloading || isRestarting}
    >
      {getContent()}
    </Modal>
  );
};
