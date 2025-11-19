/**
 * BatchImport - Component for importing multiple URLs
 */

import React, { useState } from 'react';
import { isValidUrl } from '@/utils';

interface BatchImportProps {
  onImport: (urls: string[]) => void;
}

export const BatchImport: React.FC<BatchImportProps> = ({ onImport }) => {
  const [showModal, setShowModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTextInput(text);
      setShowModal(true);
      setError(null);
    } catch (err) {
      setError('Failed to read from clipboard. Please paste manually.');
      setShowModal(true);
    }
  };

  const handleImport = () => {
    const lines = textInput.split('\n').map((line) => line.trim());
    const urls = lines.filter((line) => line && isValidUrl(line));

    if (urls.length === 0) {
      setError('No valid URLs found');
      return;
    }

    onImport(urls);
    setShowModal(false);
    setTextInput('');
    setError(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setTextInput('');
    setError(null);
  };

  const getUrlCount = () => {
    const lines = textInput.split('\n').map((line) => line.trim());
    return lines.filter((line) => line && isValidUrl(line)).length;
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={handleImportFromClipboard}
      >
        Import from Clipboard
      </button>

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="modal show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Batch Import URLs</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCancel}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <p className="text-muted">
                    Paste URLs (one per line). Invalid URLs will be automatically filtered
                    out.
                  </p>
                  <textarea
                    className={`form-control ${error ? 'is-invalid' : ''}`}
                    rows={10}
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4&#10;https://example.com/video3.mp4"
                  />
                  {error && <div className="invalid-feedback d-block">{error}</div>}
                  <div className="mt-2">
                    <small className="text-muted">
                      Valid URLs found: <strong>{getUrlCount()}</strong>
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={getUrlCount() === 0}
                  >
                    Import {getUrlCount()} URLs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
