/**
 * AboutModal - Modal displaying plugin information and GitHub links
 */

import React, { useEffect } from 'react';

// Plugin version from package.json (injected at build time via Vite)
const PLUGIN_VERSION = __APP_VERSION__;

// GitHub repository info
const GITHUB_REPO = 'Codename-11/Stash-Downloader';
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
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
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content bg-dark text-light">
            <div className="modal-header border-secondary">
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <span style={{ fontSize: '1.2rem' }}>&#x2139;&#xFE0F;</span>
                <h5 className="modal-title mb-0">About Stash Downloader</h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              <div className="d-flex flex-column gap-3">
                {/* Version Info */}
                <div className="d-flex justify-content-between align-items-center">
                  <span style={{ color: '#8b9fad' }}>Version:</span>
                  <span className="badge bg-primary">{PLUGIN_VERSION}</span>
                </div>

                {/* Description */}
                <div>
                  <p className="mb-2" style={{ color: '#8b9fad', fontSize: '0.9rem' }}>
                    A Stash plugin for downloading images and videos with automatic metadata extraction and tagging.
                  </p>
                </div>

                {/* GitHub Links */}
                <div className="card" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
                  <div className="card-body py-2">
                    <div className="d-flex flex-column gap-2">
                      <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex align-items-center gap-2 text-light text-decoration-none"
                        style={{ fontSize: '0.95rem' }}
                      >
                        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        <span>GitHub Repository</span>
                        <span style={{ color: '#8b9fad', marginLeft: 'auto' }}>
                          {GITHUB_REPO}
                        </span>
                      </a>

                      <hr className="my-1" style={{ borderColor: '#394b59' }} />

                      <a
                        href={`${GITHUB_URL}/issues`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex align-items-center gap-2 text-light text-decoration-none"
                        style={{ fontSize: '0.95rem' }}
                      >
                        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                          <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
                        </svg>
                        <span>Report Issue</span>
                      </a>

                      <a
                        href={`${GITHUB_URL}/releases`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex align-items-center gap-2 text-light text-decoration-none"
                        style={{ fontSize: '0.95rem' }}
                      >
                        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 010 2.474l-5.026 5.026a1.75 1.75 0 01-2.474 0l-6.25-6.25A1.75 1.75 0 011 7.775zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 00.354 0l5.025-5.025a.25.25 0 000-.354l-6.25-6.25a.25.25 0 00-.177-.073H2.75a.25.25 0 00-.25.25v5.025zM6 5a1 1 0 110 2 1 1 0 010-2z" />
                        </svg>
                        <span>Releases</span>
                      </a>

                      <a
                        href={`${GITHUB_URL}#readme`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex align-items-center gap-2 text-light text-decoration-none"
                        style={{ fontSize: '0.95rem' }}
                      >
                        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                          <path fillRule="evenodd" d="M0 1.75A.75.75 0 01.75 1h4.253c1.227 0 2.317.59 3 1.501A3.744 3.744 0 0111.006 1h4.245a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75h-4.507a2.25 2.25 0 00-1.591.659l-.622.621a.75.75 0 01-1.06 0l-.622-.621A2.25 2.25 0 005.258 13H.75a.75.75 0 01-.75-.75V1.75zm8.755 3a2.25 2.25 0 012.25-2.25H14.5v9h-3.757c-.71 0-1.4.201-1.992.572l.004-7.322zm-1.504 7.324l.004-5.073-.002-2.253A2.25 2.25 0 005.003 2.5H1.5v9h3.757a3.75 3.75 0 011.994.574z" />
                        </svg>
                        <span>Documentation</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Star on GitHub CTA */}
                <div className="text-center">
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-warning btn-sm"
                  >
                    <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" className="me-1">
                      <path fillRule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                    </svg>
                    Star on GitHub
                  </a>
                </div>
              </div>
            </div>

            <div className="modal-footer border-secondary">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
