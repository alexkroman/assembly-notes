import React, { useEffect } from 'react';

export interface ModalProps {
  /** Title to show in the modal header */
  title: string;
  /** Called when user clicks backdrop, close button, or presses ESC */
  onClose: () => void;
  /** Optional footer content; if omitted no footer is rendered */
  footer?: React.ReactNode;
  /** Size modifier sets `modal-content` additional class */
  size?: 'normal' | 'large';
  /** Main content */
  children: React.ReactNode;
  /** Disable overlay / ESC closing behaviour (e.g. settings modal requiring key) */
  disableClose?: boolean;
  /** Optional data-testid to put on overlay for tests */
  overlayTestId?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  footer,
  size = 'normal',
  children,
  disableClose = false,
  overlayTestId,
}) => {
  // Close on ESC
  useEffect(() => {
    if (disableClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [disableClose, onClose]);

  const handleOverlayClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (disableClose) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      data-testid={overlayTestId}
    >
      <div className={`modal-content${size === 'large' ? ' large' : ''}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className={`modal-close${disableClose ? ' disabled' : ''}`}
            onClick={() => {
              if (!disableClose) onClose();
            }}
            disabled={disableClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};