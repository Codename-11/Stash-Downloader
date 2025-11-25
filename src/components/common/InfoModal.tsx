/**
 * InfoModal - Reusable modal for displaying information and warnings
 */

import React, { useEffect } from 'react';

export type InfoModalSeverity = 'info' | 'warning' | 'error' | 'success';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  severity?: InfoModalSeverity;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  }>;
  showCloseButton?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const InfoModal: React.FC<InfoModalProps> = ({
  open,
  onClose,
  title,
  severity = 'info',
  children,
  actions,
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  if (!open) return null;

  const getSeverityIcon = () => {
    switch (severity) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const getButtonClass = (variant?: string, color?: string) => {
    if (variant === 'contained') {
      switch (color) {
        case 'error':
          return 'btn btn-danger';
        case 'warning':
          return 'btn btn-warning';
        case 'success':
          return 'btn btn-success';
        default:
          return 'btn btn-primary';
      }
    } else if (variant === 'outlined') {
      switch (color) {
        case 'error':
          return 'btn btn-outline-danger';
        case 'warning':
          return 'btn btn-outline-warning';
        case 'success':
          return 'btn btn-outline-success';
        default:
          return 'btn btn-outline-primary';
      }
    }
    return 'btn btn-link';
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <span style={{ fontSize: '1.2rem' }}>{getSeverityIcon()}</span>
                <h5 className="modal-title mb-0">{title}</h5>
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                />
              )}
            </div>

            <div className="modal-body">
              <div className="py-1">{children}</div>
            </div>

            {(actions || showCloseButton) && (
              <div className="modal-footer">
                {actions?.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    className={getButtonClass(action.variant, action.color)}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                ))}
                {!actions && showCloseButton && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onClose}
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
