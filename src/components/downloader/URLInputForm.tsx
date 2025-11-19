/**
 * URLInputForm - Component for entering URLs to download
 */

import React, { useState } from 'react';
import { isValidUrl } from '@/utils';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export const URLInputForm: React.FC<URLInputFormProps> = ({
  onSubmit,
  disabled = false,
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="mb-3">
        <label htmlFor="url-input" className="form-label">
          Download URL
        </label>
        <div className="input-group">
          <input
            id="url-input"
            type="text"
            className={`form-control ${error ? 'is-invalid' : ''}`}
            placeholder="https://example.com/video.mp4"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            disabled={disabled}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={disabled || !url.trim()}
          >
            Add to Queue
          </button>
        </div>
        {error && <div className="invalid-feedback d-block">{error}</div>}
      </div>
      <small className="text-muted">
        Enter a direct URL to a video or image file, or a URL from a supported site
      </small>
    </form>
  );
};
