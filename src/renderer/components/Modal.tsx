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
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className={`modal-close ${closeDisabled ? 'disabled' : ''}`}
            data-testid="close-modal-btn"
            onClick={onClose}
            disabled={closeDisabled}
          >
            ×
          </button>
        </div>

        <div className="modal-body" data-testid={bodyTestId}>
          {children}
        </div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
