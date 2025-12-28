/**
 * ErrorMessage - Display error messages (Bootstrap)
 */

import React from 'react';

interface ErrorMessageProps {
  error: string | Error;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const errorText = typeof error === 'string' ? error : error.message;

  return (
    <div className="alert alert-danger alert-dismissible" role="alert">
      <h6 className="alert-heading">Error</h6>
      <p className="mb-0">{errorText}</p>
      {onRetry && (
        <div className="mt-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
      {onDismiss && (
        <button
          type="button"
          className="btn-close"
          onClick={onDismiss}
          aria-label="Close"
        />
      )}
    </div>
  );
};
