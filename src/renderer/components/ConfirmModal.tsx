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
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-transparent">
          <h2 className="m-0 text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            className="bg-transparent border-none text-text-secondary text-xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded-sm transition-all duration-200 hover:bg-surface-hover hover:text-foreground"
            data-testid="close-confirm-modal-btn"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <div className="px-3 py-2.5 overflow-y-auto flex-1">
          <p className="m-0 text-base text-text-primary">{message}</p>
        </div>

        <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-border bg-transparent">
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
