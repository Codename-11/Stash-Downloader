/**
 * ToastContainer - Bootstrap toast container for notifications
 */

import React, { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    const timers = toasts.map((toast) => {
      const duration = toast.duration || 5000;
      return setTimeout(() => {
        removeToast(toast.id);
      }, duration);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  const getToastClass = (type: string): string => {
    const baseClasses = 'toast show';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-success text-white`;
      case 'error':
        return `${baseClasses} bg-danger text-white`;
      case 'warning':
        return `${baseClasses} bg-warning text-dark`;
      case 'info':
        return `${baseClasses} bg-info text-white`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={getToastClass(toast.type)}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="toast-header">
            <strong className="me-auto">{toast.title}</strong>
            <button
              type="button"
              className="btn-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close"
            />
          </div>
          <div className="toast-body">{toast.message}</div>
        </div>
      ))}
    </div>
  );
};

