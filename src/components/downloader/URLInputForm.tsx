/**
 * URLInputForm - Component for entering URLs to download
 */

import React, { useState, useEffect } from 'react';
import { isValidUrl } from '@/utils';
import { ContentType } from '@/types';

export type ContentTypeOption = ContentType | 'auto';

interface URLInputFormProps {
  onSubmit: (url: string, contentType: ContentTypeOption) => void;
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
  const [contentType, setContentType] = useState<ContentTypeOption>('auto');

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

    onSubmit(url, contentType);
    setUrl('');
    setContentType('auto'); // Reset to auto after submission
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3">
      <div className="mb-3">
        <label htmlFor="url-input" className="form-label text-light">
          Download URL
        </label>
        <div className="d-flex gap-2">
          <input
            id="url-input"
            type="text"
            className={`form-control text-light flex-grow-1 ${error ? 'is-invalid' : ''}`}
            style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
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
          <select
            className="form-select text-light"
            style={{
              backgroundColor: '#243340',
              borderColor: '#394b59',
              width: '140px',
              flexShrink: 0,
            }}
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentTypeOption)}
            disabled={disabled}
            title="Content type preference"
          >
            <option value="auto">Auto-detect</option>
            <option value={ContentType.Video}>Video</option>
            <option value={ContentType.Image}>Image</option>
            <option value={ContentType.Gallery}>Gallery</option>
          </select>
        </div>
        <div className={error ? 'invalid-feedback d-block' : 'form-text'} style={{ color: error ? undefined : '#8b9fad' }}>
          {error || 'Enter a URL from a supported site. Use the dropdown to specify content type.'}
        </div>
      </div>
      <button
        type="submit"
        className="btn btn-success"
        disabled={disabled || !url.trim()}
      >
        ➕ Add to Queue
      </button>
    </form>
  );
};
