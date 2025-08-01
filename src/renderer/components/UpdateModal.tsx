import React from 'react';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setShowUpdateModal } from '../store';

export const UpdateModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { showUpdateModal } = useAppSelector((state) => state.ui);
  const updateState = useAppSelector((state) => state.update);

  if (!showUpdateModal || !updateState.available) {
    return null;
  }

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Error installing update:', error);
    }
  };

  const handleClose = () => {
    dispatch(setShowUpdateModal(false));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold text-white mb-4">
          Update Available
        </h2>

        <div className="space-y-4">
          <p className="text-gray-300">
            Version {updateState.updateInfo?.version} is available and ready to
            install.
          </p>

          {updateState.downloading && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Downloading update... {Math.round(updateState.progress)}%
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${String(updateState.progress)}%` }}
                />
              </div>
            </div>
          )}

          {updateState.downloaded && (
            <p className="text-green-400">
              Update downloaded and ready to install!
            </p>
          )}

          {updateState.error && (
            <p className="text-red-400">Error: {updateState.error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Later
          </button>
          {updateState.downloaded && (
            <button
              onClick={() => void handleInstallUpdate()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Install and Restart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
