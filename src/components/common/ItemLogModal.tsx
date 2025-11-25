/**
 * ItemLogModal - Modal for displaying logs for a specific download item
 */

import React, { useState, useEffect } from 'react';
import type { IItemLogEntry } from '@/types';

interface ItemLogModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  logs: IItemLogEntry[];
}

export const ItemLogModal: React.FC<ItemLogModalProps> = ({
  open,
  onClose,
  title,
  logs,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  if (!open) return null;

  const getLevelIcon = (level: IItemLogEntry['level']) => {
    switch (level) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getLevelBadgeClass = (level: IItemLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-danger';
      default:
        return 'bg-info';
    }
  };

  const getLevelBorderClass = (level: IItemLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'border-success';
      case 'warning':
        return 'border-warning';
      case 'error':
        return 'border-danger';
      default:
        return 'border-info';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

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
              <div className="flex-grow-1">
                <h5 className="modal-title mb-0">Download Logs</h5>
                <p className="text-muted mb-0 small mt-1">{title}</p>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div className="alert alert-info">No logs available for this item yet.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`card bg-secondary border-start border-4 ${getLevelBorderClass(log.level)}`}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex align-items-start gap-2">
                          <span style={{ fontSize: '1rem', marginTop: '2px' }}>
                            {getLevelIcon(log.level)}
                          </span>
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span
                                className="text-muted small"
                                style={{ fontFamily: 'monospace' }}
                              >
                                {formatTimestamp(log.timestamp)}
                              </span>
                              <span
                                className={`badge ${getLevelBadgeClass(log.level)}`}
                                style={{ fontSize: '0.65rem' }}
                              >
                                {log.level.toUpperCase()}
                              </span>
                            </div>
                            <p className="mb-0 text-light" style={{ wordBreak: 'break-word' }}>
                              {log.message}
                            </p>
                            {log.details && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-info p-0 mt-1"
                                  onClick={() =>
                                    setExpandedLogId(expandedLogId === index ? null : index)
                                  }
                                >
                                  <span className="small">
                                    {expandedLogId === index ? '▲' : '▼'}{' '}
                                    {expandedLogId === index ? 'Hide' : 'Show'} Details
                                  </span>
                                </button>
                                {expandedLogId === index && (
                                  <div
                                    className="border border-dark rounded mt-2 p-2 bg-black"
                                    style={{
                                      maxHeight: '200px',
                                      overflow: 'auto',
                                    }}
                                  >
                                    <pre
                                      className="small mb-0 text-light"
                                      style={{
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {log.details}
                                    </pre>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer border-secondary">
              <span className="text-muted small flex-grow-1">
                {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
              </span>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
