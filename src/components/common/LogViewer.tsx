/**
 * LogViewer - Component for displaying application logs
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useLog, type LogLevel, type ILogEntry } from '@/contexts/LogContext';

interface LogViewerProps {
  maxHeight?: string;
  showFilters?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  maxHeight = '400px',
  showFilters = true,
}) => {
  const { logs, clearLogs } = useLog();
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ILogEntry | null>(null);

  useEffect(() => {
    if (selectedLog) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [selectedLog]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(logs.map((log) => log.category));
    return Array.from(uniqueCategories).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
      const categoryMatch = selectedCategory === 'all' || log.category === selectedCategory;
      return levelMatch && categoryMatch;
    });
  }, [logs, selectedLevel, selectedCategory]);

  const getLevelBadgeClass = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return 'bg-danger';
      case 'warning':
        return 'bg-warning';
      case 'success':
        return 'bg-success';
      default:
        return 'bg-info';
    }
  };

  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as any).format(date);
  };

  const formatFullTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as any).format(date);
  };

  return (
    <div className="card text-light mt-3" style={{ backgroundColor: '#30404d' }}>
      <div className="card-header" style={{ backgroundColor: '#243340' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0">Activity Log</h6>
            {logs.length > 0 && <span className="badge bg-secondary">{logs.length}</span>}
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲' : '▼'} {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            {logs.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={clearLogs}
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {showFilters && (
            <div className="card-body" style={{ borderBottom: '1px solid #243340' }}>
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label small" style={{ color: '#8b9fad' }}>Filter by Level</label>
                  <select
                    className="form-select form-select-sm text-light"
                    style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as LogLevel | 'all')}
                  >
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small" style={{ color: '#8b9fad' }}>Filter by Category</label>
                  <select
                    className="form-select form-select-sm text-light"
                    style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ maxHeight, overflowY: 'auto', overflowX: 'hidden' }}>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-muted mb-0 small">No logs to display</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ backgroundColor: '#30404d', color: '#fff' }}>
                  <thead className="sticky-top" style={{ backgroundColor: '#243340' }}>
                    <tr>
                      <th style={{ width: '120px' }}>Time</th>
                      <th style={{ width: '80px' }}>Level</th>
                      <th style={{ width: '120px' }}>Category</th>
                      <th>Message</th>
                      <th style={{ width: '60px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span className="text-secondary small">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-secondary">{log.category}</span>
                        </td>
                        <td>{log.message}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0"
                            onClick={() => setSelectedLog(log)}
                            title="View full details"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <>
          <div className="modal-backdrop fade show" onClick={() => setSelectedLog(null)} />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content bg-dark text-light">
                <div className="modal-header border-secondary">
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${getLevelBadgeClass(selectedLog.level)}`}>
                      {selectedLog.level}
                    </span>
                    <h5 className="modal-title mb-0">Log Entry Details</h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setSelectedLog(null)}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <p className="text-muted small mb-1 fw-bold">Timestamp</p>
                      <p className="mb-0">{formatFullTimestamp(selectedLog.timestamp)}</p>
                    </div>

                    <div>
                      <p className="text-muted small mb-1 fw-bold">Level</p>
                      <span className={`badge ${getLevelBadgeClass(selectedLog.level)}`}>
                        {selectedLog.level}
                      </span>
                    </div>

                    <div>
                      <p className="text-muted small mb-1 fw-bold">Category</p>
                      <span className="badge bg-secondary">{selectedLog.category}</span>
                    </div>

                    <div>
                      <p className="text-muted small mb-1 fw-bold">Message</p>
                      <div className="p-2 bg-secondary border border-secondary rounded">
                        <p className="mb-0">{selectedLog.message}</p>
                      </div>
                    </div>

                    {selectedLog.details && (
                      <div>
                        <p className="text-muted small mb-1 fw-bold">Details</p>
                        <div
                          className="p-2 bg-black text-white border border-secondary rounded"
                          style={{ maxHeight: '400px', overflow: 'auto' }}
                        >
                          <pre
                            className="mb-0 small"
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              color: 'inherit',
                            }}
                          >
                            {selectedLog.details}
                          </pre>
                        </div>
                      </div>
                    )}

                    {!selectedLog.details && (
                      <p className="text-muted small mb-0">
                        No additional details available
                      </p>
                    )}
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedLog(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

