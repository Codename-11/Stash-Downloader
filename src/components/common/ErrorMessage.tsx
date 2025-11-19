/**
 * ErrorMessage - Display error messages
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
      <h5 className="alert-heading">Error</h5>
      <p className="mb-0">{errorText}</p>
      <div className="mt-2">
        {onRetry && (
          <button className="btn btn-sm btn-outline-danger me-2" onClick={onRetry}>
            Retry
          </button>
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
    </div>
  );
};
