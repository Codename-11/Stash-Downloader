/**
 * Bulk action buttons for tagger
 */

import React from 'react';
import type { MatchStats } from '@/types/matching';

interface BulkActionsProps {
  stats: MatchStats;
  onAutoMatchAll: () => void;
  onRefresh: () => void;
  onClearSkipped?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  stats,
  onAutoMatchAll,
  onRefresh,
  onClearSkipped,
  loading = false,
  disabled = false,
}) => {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      {/* Stats */}
      <div className="d-flex gap-3 me-auto">
        <span className="text-muted">
          Total: <strong className="text-light">{stats.total}</strong>
        </span>
        <span className="text-muted">
          Matched: <strong className="text-success">{stats.matched}</strong>
        </span>
        <span className="text-muted">
          Unmatched: <strong className="text-warning">{stats.unmatched}</strong>
        </span>
        {stats.skipped > 0 && (
          <span className="text-muted">
            Skipped: <strong className="text-secondary">{stats.skipped}</strong>
          </span>
        )}
        {stats.autoMatchEligible > 0 && (
          <span className="text-muted">
            Auto-eligible: <strong className="text-info">{stats.autoMatchEligible}</strong>
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="d-flex gap-2">
        {stats.skipped > 0 && onClearSkipped && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClearSkipped}
            disabled={disabled || loading}
          >
            Clear Skipped
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline-light btn-sm"
          onClick={onRefresh}
          disabled={disabled || loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" />
              Loading...
            </>
          ) : (
            'Refresh'
          )}
        </button>

        {stats.autoMatchEligible > 0 && (
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={onAutoMatchAll}
            disabled={disabled || loading}
          >
            Auto-match All ({stats.autoMatchEligible})
          </button>
        )}
      </div>
    </div>
  );
};
