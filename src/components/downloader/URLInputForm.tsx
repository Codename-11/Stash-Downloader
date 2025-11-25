/**
 * URLInputForm - Component for entering URLs to download
 */

import React, { useState, useEffect } from 'react';
import { isValidUrl } from '@/utils';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
  initialValue?: string;
  onValueChange?: (value: string) => void;
}

export const URLInputForm: React.FC<URLInputFormProps> = ({
  onSubmit,
  disabled = false,
  initialValue = '',
  onValueChange,
}) => {
  const [url, setUrl] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValue && initialValue !== url) {
      setUrl(initialValue);
      if (onValueChange) {
        onValueChange(initialValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    onSubmit(url);
    setUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3">
      <div className="mb-3">
        <label htmlFor="url-input" className="form-label">
          Download URL
        </label>
        <input
          id="url-input"
          type="text"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          placeholder="https://example.com/video.mp4"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
            if (onValueChange) {
              onValueChange(e.target.value);
            }
          }}
          disabled={disabled}
        />
        <div className={error ? 'invalid-feedback' : 'form-text'}>
          {error || 'Enter a direct URL to a video or image file, or a URL from a supported site'}
        </div>
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disabled || !url.trim()}
      >
        ➕ Add to Queue
      </button>
    </form>
  );
};
