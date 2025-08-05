import React, { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      data-testid="confirm-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="modal-content">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.12] bg-white/[0.04]">
          <h2 className="m-0 text-sm font-semibold text-white">{title}</h2>
          <button
            className="bg-transparent border-none text-white/[0.70] text-lg cursor-pointer p-0 w-5 h-5 flex items-center justify-center rounded-sm transition-all duration-200 hover:bg-white/[0.09] hover:text-white"
            data-testid="close-confirm-modal-btn"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <div className="px-2 py-2 overflow-y-auto flex-1 bg-black/[0.15]">
          <p className="m-0 text-sm text-white/[0.85]">{message}</p>
        </div>

        <div className="flex justify-end gap-1 px-2 py-1.5 border-t border-white/[0.12] bg-white/[0.03]">
          <button
            className="btn-secondary"
            data-testid="cancel-confirm-btn"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={
              confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'
            }
            data-testid="confirm-btn"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
