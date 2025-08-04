import React from 'react';

export interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'normal' | 'large';
  testId?: string;
  bodyTestId?: string;
  closeDisabled?: boolean;
  onOverlayClick?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen = true,
  onClose,
  title,
  children,
  footer,
  size = 'normal',
  testId,
  bodyTestId,
  closeDisabled = false,
  onOverlayClick,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (onOverlayClick) {
        onOverlayClick();
      } else if (!closeDisabled) {
        onClose();
      }
    }
  };

  return (
    <div
      className="modal-overlay"
      data-testid={testId}
      onClick={handleOverlayClick}
    >
      <div className={`modal-content ${size === 'large' ? 'large' : ''}`}>
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.12] bg-white/[0.04]">
          <h2 className="m-0 text-sm font-semibold text-white">{title}</h2>
          <button
            className={`bg-transparent border-none text-white/[0.70] text-lg cursor-pointer p-0 w-5 h-5 flex items-center justify-center rounded-sm transition-all duration-200 hover:bg-white/[0.09] hover:text-white ${closeDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-testid="close-modal-btn"
            onClick={onClose}
            disabled={closeDisabled}
          >
            ×
          </button>
        </div>

        <div
          className="px-2 py-2 overflow-y-auto flex-1 bg-black/[0.15]"
          data-testid={bodyTestId}
        >
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-1 px-2 py-1.5 border-t border-white/[0.12] bg-white/[0.03]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
