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
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.12] bg-transparent">
          <h2 className="m-0 text-base font-semibold text-white">{title}</h2>
          <button
            className="bg-transparent border-none text-white/[0.70] text-xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded-sm transition-all duration-200 hover:bg-white/[0.09] hover:text-white"
            data-testid="close-confirm-modal-btn"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <div className="px-3 py-2.5 overflow-y-auto flex-1">
          <p className="m-0 text-base text-white/[0.85]">{message}</p>
        </div>

        <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-white/[0.12] bg-transparent">
          <button
            className="px-4 py-2 bg-white/[0.09] border border-white/[0.18] text-white/[0.85] rounded-sm cursor-pointer font-medium transition-all duration-200 hover:bg-white/[0.12] hover:text-white"
            data-testid="cancel-confirm-btn"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={
              confirmVariant === 'danger'
                ? 'px-3 py-1.5 bg-[#dc3545]/20 border border-[#dc3545]/50 text-[#dc3545] rounded-sm cursor-pointer font-medium transition-all duration-200 hover:bg-[#dc3545]/30'
                : 'px-3 py-1.5 bg-[#28a745]/20 border border-[#28a745]/50 text-[#28a745] rounded-sm cursor-pointer font-medium transition-all duration-200 hover:bg-[#28a745]/30'
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
