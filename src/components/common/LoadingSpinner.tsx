/**
 * LoadingSpinner - Reusable loading indicator
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
}) => {
  const sizeClass = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg',
  }[size];

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-4">
      <div className={`spinner-border text-primary ${sizeClass}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </div>
  );
};
