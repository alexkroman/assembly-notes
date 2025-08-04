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
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-transparent">
          <h2 className="m-0 text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            className={`bg-transparent border-none text-text-secondary text-xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded-sm transition-all duration-200 hover:bg-surface-hover hover:text-foreground ${closeDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-testid="close-modal-btn"
            onClick={onClose}
            disabled={closeDisabled}
          >
            ×
          </button>
        </div>

        <div
          className="px-3 py-2.5 overflow-y-auto flex-1"
          data-testid={bodyTestId}
        >
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-1.5 px-3 py-2 border-t border-border bg-transparent">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
