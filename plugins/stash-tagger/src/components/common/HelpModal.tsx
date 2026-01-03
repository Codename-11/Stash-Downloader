/**
 * HelpModal - Modal displaying usage information and help
 */

import React, { useEffect } from 'react';
import { APP_VERSION, PLUGIN_NAME, CONFIDENCE_THRESHOLDS } from '@/constants';

// GitHub repository info
const GITHUB_REPO = 'Codename-11/Stash-Downloader';
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content bg-dark text-light">
            <div className="modal-header border-secondary">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <span style={{ fontSize: '1.2rem' }}>?</span>
                <h5 className="modal-title mb-0">{PLUGIN_NAME} Help</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="d-flex flex-column gap-4">
                {/* What is this plugin */}
                <section>
                  <h6 className="text-primary mb-2">What is {PLUGIN_NAME}?</h6>
                  <p className="mb-0" style={{ color: '#8b9fad', fontSize: '0.9rem' }}>
                    {PLUGIN_NAME} helps you link your local studios, performers, and tags
                    to their corresponding entries in StashBox databases (like StashDB or ThePornDB).
                    This enables better metadata and makes your library more organized.
                  </p>
                </section>

                {/* How to use */}
                <section>
                  <h6 className="text-primary mb-2">How to Use</h6>
                  <ol className="mb-0 ps-3" style={{ color: '#8b9fad', fontSize: '0.9rem' }}>
                    <li className="mb-2">
                      <strong className="text-light">Select a StashBox instance</strong> from the dropdown
                      (configure these in Stash Settings &rarr; Metadata Providers &rarr; Stash-box Endpoints)
                    </li>
                    <li className="mb-2">
                      <strong className="text-light">Choose a tab</strong> (Studios, Performers, or Tags)
                      to see unmatched items
                    </li>
                    <li className="mb-2">
                      <strong className="text-light">Review matches</strong> - the plugin will search
                      StashBox and show potential matches with confidence scores
                    </li>
                    <li className="mb-2">
                      <strong className="text-light">Apply matches</strong> individually or use
                      "Auto-Match All" for high-confidence matches
                    </li>
                  </ol>
                </section>

                {/* Confidence levels */}
                <section>
                  <h6 className="text-primary mb-2">Confidence Levels</h6>
                  <div
                    className="p-3"
                    style={{
                      backgroundColor: '#243340',
                      borderRadius: '4px',
                      border: '1px solid #394b59',
                    }}
                  >
                    <div className="d-flex flex-column gap-2" style={{ fontSize: '0.9rem' }}>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#198754',
                            minWidth: '80px',
                          }}
                        >
                          {CONFIDENCE_THRESHOLDS.HIGH}%+
                        </span>
                        <span style={{ color: '#8b9fad' }}>
                          <strong className="text-success">High confidence</strong> - Safe for auto-matching
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#ffc107',
                            color: '#000',
                            minWidth: '80px',
                          }}
                        >
                          {CONFIDENCE_THRESHOLDS.MEDIUM}-{CONFIDENCE_THRESHOLDS.HIGH - 1}%
                        </span>
                        <span style={{ color: '#8b9fad' }}>
                          <strong className="text-warning">Medium confidence</strong> - Review before applying
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#dc3545',
                            minWidth: '80px',
                          }}
                        >
                          &lt;{CONFIDENCE_THRESHOLDS.MEDIUM}%
                        </span>
                        <span style={{ color: '#8b9fad' }}>
                          <strong className="text-danger">Low confidence</strong> - Likely not a match
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bulk actions */}
                <section>
                  <h6 className="text-primary mb-2">Bulk Actions</h6>
                  <ul className="mb-0 ps-3" style={{ color: '#8b9fad', fontSize: '0.9rem' }}>
                    <li className="mb-1">
                      <strong className="text-light">Auto-Match All</strong> - Automatically applies
                      all matches with {CONFIDENCE_THRESHOLDS.HIGH}%+ confidence
                    </li>
                    <li className="mb-1">
                      <strong className="text-light">Refresh</strong> - Re-fetch unmatched items and
                      search for new matches
                    </li>
                    <li className="mb-1">
                      <strong className="text-light">Clear Skipped</strong> - Reset any items you
                      previously skipped
                    </li>
                  </ul>
                </section>

                {/* Tips */}
                <section>
                  <h6 className="text-primary mb-2">Tips</h6>
                  <ul className="mb-0 ps-3" style={{ color: '#8b9fad', fontSize: '0.9rem' }}>
                    <li className="mb-1">
                      If a match isn't found, click "Search StashBox" to manually search
                    </li>
                    <li className="mb-1">
                      Matching is based on name similarity - ensure your local names are accurate
                    </li>
                    <li className="mb-1">
                      Parent studios are automatically created when applying studio matches
                    </li>
                    <li className="mb-1">
                      You can adjust the auto-match threshold in plugin settings
                    </li>
                  </ul>
                </section>

                {/* Links */}
                <section>
                  <h6 className="text-primary mb-2">Links</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-light btn-sm"
                    >
                      <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" className="me-1">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                      GitHub
                    </a>
                    <a
                      href={`${GITHUB_URL}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-light btn-sm"
                    >
                      Report Issue
                    </a>
                    <a
                      href={`${GITHUB_URL}#readme`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-light btn-sm"
                    >
                      Documentation
                    </a>
                  </div>
                </section>

                {/* Version */}
                <div className="text-center pt-2 border-top" style={{ borderColor: '#394b59' }}>
                  <small className="text-muted">
                    {PLUGIN_NAME} v{APP_VERSION}
                  </small>
                </div>
              </div>
            </div>

            <div className="modal-footer border-secondary">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
