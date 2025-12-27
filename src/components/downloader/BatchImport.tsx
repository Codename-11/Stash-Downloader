/**
 * BatchImport - Component for importing multiple URLs
 */

import React, { useState, useEffect, useRef } from 'react';
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
  const [showFirefoxNote, setShowFirefoxNote] = useState(false);
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect Firefox once
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');

  // Auto-focus textarea when modal opens (allows immediate Ctrl+V paste)
  useEffect(() => {
    if (showModal && textareaRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [showModal]);

  useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  const handleImportFromClipboard = async () => {
    // Firefox doesn't support clipboard.readText() for web pages - just open modal with manual paste
    if (isFirefox) {
      toast.showToast('info', 'Paste URLs', 'Use Ctrl+V to paste your URLs.');
      setShowFirefoxNote(true);
      setShowModal(true);
      setError(null);
      return;
    }

    // Check if Clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      console.warn('[BatchImport] Clipboard API not available - opening manual paste dialog');
      toast.showToast('info', 'Paste URLs', 'Use Ctrl+V to paste your URLs.');
      setShowModal(true);
      setError(null);
      return;
    }

    try {
      // Ensure window is focused (required for clipboard access in some browsers)
      window.focus();

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
    } catch (err) {
      // Log actual error for debugging
      console.error('[BatchImport] Clipboard read failed:', err);
      console.info('[BatchImport] Opening manual paste dialog as fallback');
      toast.showToast('info', 'Paste URLs', 'Use Ctrl+V to paste your URLs.');
      setShowModal(true);
      setError(null);
    }
  };

  const handleBatchImportClick = () => {
    setShowModal(true);
    setTextInput('');
    setError(null);
    setShowFirefoxNote(false);
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
    setShowFirefoxNote(false);
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
                  {showFirefoxNote && (
                    <div className="alert alert-info d-flex align-items-center gap-2 py-2 mb-3" role="alert">
                      <span style={{ fontSize: '1.2em' }}>🦊</span>
                      <span>
                        <strong>Firefox:</strong> Clipboard access requires manual paste. Press <kbd>Ctrl+V</kbd> (or <kbd>Cmd+V</kbd>) below.
                      </span>
                    </div>
                  )}
                  <p className="text-muted mb-3">
                    Paste URLs (one per line). Invalid URLs will be automatically filtered out.
                  </p>
                  <textarea
                    ref={textareaRef}
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
