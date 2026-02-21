/**
 * ItemLogModal - Compact terminal-style log viewer for download items
 */

import React, { useState, useEffect, useRef } from 'react';
import type { IItemLogEntry } from '@/types';

interface ItemLogModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  logs: IItemLogEntry[];
}

const LEVEL_COLORS: Record<IItemLogEntry['level'], string> = {
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#8b9fad',
};

const LEVEL_LABELS: Record<IItemLogEntry['level'], string> = {
  success: 'OK',
  warning: 'WARN',
  error: 'ERR',
  info: 'INFO',
};

export const ItemLogModal: React.FC<ItemLogModalProps> = ({
  open,
  onClose,
  title,
  logs,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [filter, setFilter] = useState<IItemLogEntry['level'] | 'all'>('all');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      // Auto-scroll to bottom on open
      setTimeout(() => logEndRef.current?.scrollIntoView(), 50);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  if (!open) return null;

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);
  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warning').length;

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
            {/* Header */}
            <div
              className="modal-header border-secondary py-2"
              style={{ backgroundColor: '#243340' }}
            >
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <h6 className="modal-title mb-0">Download Logs</h6>
                <div
                  className="text-muted small text-truncate"
                  title={title}
                  style={{ maxWidth: '100%' }}
                >
                  {title}
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {/* Filter bar */}
            <div
              className="d-flex align-items-center gap-2 px-3 py-1 border-bottom"
              style={{ backgroundColor: '#1a2830', borderColor: '#394b59 !important' }}
            >
              <span className="text-muted small me-1">Filter:</span>
              {(['all', 'error', 'warning', 'success', 'info'] as const).map((level) => {
                const isActive = filter === level;
                const count = level === 'all' ? logs.length
                  : logs.filter(l => l.level === level).length;
                if (count === 0 && level !== 'all') return null;
                return (
                  <button
                    key={level}
                    type="button"
                    className={`btn btn-sm py-0 px-2 ${isActive ? 'btn-outline-light' : 'btn-link text-muted'}`}
                    style={{ fontSize: '0.7rem', textDecoration: 'none' }}
                    onClick={() => setFilter(level)}
                  >
                    {level === 'all' ? 'All' : LEVEL_LABELS[level]}
                    {' '}({count})
                  </button>
                );
              })}
            </div>

            {/* Log content - terminal style */}
            <div
              className="modal-body p-0"
              style={{
                maxHeight: '55vh',
                overflowY: 'auto',
                backgroundColor: '#1a2830',
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '0.8rem',
              }}
            >
              {filteredLogs.length === 0 ? (
                <div className="text-muted p-3 text-center small">
                  {logs.length === 0 ? 'No logs yet.' : 'No matching logs.'}
                </div>
              ) : (
                <div>
                  {filteredLogs.map((log, index) => {
                    const color = LEVEL_COLORS[log.level];
                    const label = LEVEL_LABELS[log.level];
                    const hasDetails = !!log.details;
                    const isExpanded = expandedLogId === index;

                    return (
                      <div
                        key={index}
                        style={{
                          borderBottom: '1px solid #243340',
                          cursor: hasDetails ? 'pointer' : 'default',
                        }}
                        onClick={hasDetails ? () => setExpandedLogId(isExpanded ? null : index) : undefined}
                      >
                        {/* Log line */}
                        <div
                          className="d-flex align-items-start px-3 py-1"
                          style={{
                            backgroundColor: log.level === 'error' ? 'rgba(220, 53, 69, 0.08)' : undefined,
                          }}
                        >
                          {/* Timestamp */}
                          <span
                            className="text-muted flex-shrink-0 me-2"
                            style={{ fontSize: '0.75rem', lineHeight: '1.5', opacity: 0.6 }}
                          >
                            {formatTimestamp(log.timestamp)}
                          </span>

                          {/* Level tag */}
                          <span
                            className="flex-shrink-0 me-2 text-end"
                            style={{
                              color,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              width: '32px',
                              lineHeight: '1.5',
                            }}
                          >
                            {label}
                          </span>

                          {/* Message */}
                          <span
                            className="flex-grow-1"
                            style={{
                              color: log.level === 'error' ? '#f8a0a8'
                                : log.level === 'warning' ? '#ffd866'
                                : log.level === 'success' ? '#7dcea0'
                                : '#c8d6e0',
                              lineHeight: '1.5',
                              wordBreak: 'break-word',
                            }}
                          >
                            {log.message}
                          </span>

                          {/* Expand indicator */}
                          {hasDetails && (
                            <span
                              className="text-muted flex-shrink-0 ms-2"
                              style={{ fontSize: '0.7rem', lineHeight: '1.5' }}
                            >
                              {isExpanded ? '\u25B2' : '\u25BC'}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {hasDetails && isExpanded && (
                          <div
                            className="px-3 pb-2"
                            style={{ paddingLeft: 'calc(0.75rem + 98px)' }}
                          >
                            <pre
                              className="mb-0 p-2 rounded small"
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                color: '#8b9fad',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.75rem',
                                maxHeight: '150px',
                                overflow: 'auto',
                              }}
                            >
                              {log.details}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>

            {/* Footer with summary */}
            <div
              className="modal-footer border-secondary py-2 px-3"
              style={{ backgroundColor: '#243340' }}
            >
              <div className="d-flex align-items-center gap-3 flex-grow-1 small">
                <span className="text-muted">
                  {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                </span>
                {errorCount > 0 && (
                  <span style={{ color: LEVEL_COLORS.error }}>
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </span>
                )}
                {warnCount > 0 && (
                  <span style={{ color: LEVEL_COLORS.warning }}>
                    {warnCount} {warnCount === 1 ? 'warning' : 'warnings'}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
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
