/**
 * BatchImport - Component for importing multiple URLs
 */

import React, { useState, useEffect } from 'react';
import { isValidUrl } from '@/utils';
import { useToast } from '@/contexts/ToastContext';

interface BatchImportProps {
  onImport: (urls: string[]) => void;
  onSingleUrl?: (url: string) => void; // Callback for single URL (to autofill URL field)
}

export const BatchImport: React.FC<BatchImportProps> = ({ onImport, onSingleUrl }) => {
  const [showModal, setShowModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmedText = text.trim();

      if (!trimmedText) {
        toast.showToast('warning', 'Clipboard Empty', 'Clipboard does not contain any text.');
        return;
      }

      const lines = trimmedText.split('\n').map((line) => line.trim()).filter(line => line);
      const validUrls = lines.filter((line) => isValidUrl(line));

      if (validUrls.length === 1 && lines.length === 1 && validUrls[0]) {
        if (onSingleUrl) {
          onSingleUrl(validUrls[0]);
          toast.showToast('success', 'URL Copied', 'URL from clipboard has been filled in the URL field.');
        } else {
          setTextInput(trimmedText);
          setShowModal(true);
          setError(null);
        }
      } else if (validUrls.length > 1) {
        setTextInput(trimmedText);
        setShowModal(true);
        setError(null);
        toast.showToast('info', 'Multiple URLs Detected', `Found ${validUrls.length} URLs. Opening batch import...`);
      } else if (validUrls.length === 0) {
        toast.showToast('error', 'No Valid URLs', 'Clipboard does not contain any valid URLs.');
        setTextInput(trimmedText);
        setShowModal(true);
        setError('No valid URLs found in clipboard');
      } else {
        setTextInput(trimmedText);
        setShowModal(true);
        setError(null);
      }
    } catch (_err) {
      const errorMsg = 'Failed to read from clipboard. Please paste manually.';
      toast.showToast('error', 'Clipboard Error', errorMsg);
      setError(errorMsg);
      setShowModal(true);
    }
  };

  const handleBatchImportClick = () => {
    setShowModal(true);
    setTextInput('');
    setError(null);
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
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-outline-light"
          onClick={handleImportFromClipboard}
          title="Import single URL from clipboard (autofills URL field) or multiple URLs (opens batch import)"
        >
          📋 Import from Clipboard
        </button>
        <button
          type="button"
          className="btn btn-outline-warning"
          onClick={handleBatchImportClick}
          title="Open batch import dialog to paste multiple URLs"
        >
          📦 Batch Import
        </button>
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show" onClick={handleCancel} />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content bg-dark text-light">
                <div className="modal-header border-secondary">
                  <h5 className="modal-title">Batch Import URLs</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={handleCancel}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <p className="text-muted mb-3">
                    Paste URLs (one per line). Invalid URLs will be automatically filtered out.
                  </p>
                  <textarea
                    className={`form-control bg-dark text-light border-secondary ${error ? 'is-invalid' : ''}`}
                    rows={10}
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4&#10;https://example.com/video3.mp4"
                  />
                  {error && <div className="invalid-feedback d-block">{error}</div>}
                  <p className="text-muted small mt-2 mb-0">
                    Valid URLs found: <strong>{getUrlCount()}</strong>
                  </p>
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
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
