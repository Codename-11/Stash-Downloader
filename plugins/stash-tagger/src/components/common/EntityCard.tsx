/**
 * Generic entity card component (expandable)
 */

import React, { useState } from 'react';
import type { MatchStatus } from '@/types/matching';

interface EntityCardProps {
  id: string;
  name: string;
  imagePath?: string;
  status: MatchStatus;
  subtitle?: string;
  children?: React.ReactNode;
  onExpand?: () => void;
  defaultExpanded?: boolean;
}

const statusColors: Record<MatchStatus, string> = {
  pending: '#6c757d',   // secondary
  matched: '#198754',   // success
  skipped: '#ffc107',   // warning
  error: '#dc3545',     // danger
};

const statusLabels: Record<MatchStatus, string> = {
  pending: 'Pending',
  matched: 'Matched',
  skipped: 'Skipped',
  error: 'Error',
};

export const EntityCard: React.FC<EntityCardProps> = ({
  id: _id,
  name,
  imagePath,
  status,
  subtitle,
  children,
  onExpand,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded && onExpand) {
      onExpand();
    }
  };

  return (
    <div
      className="card mb-2"
      style={{
        backgroundColor: '#30404d',
        borderColor: '#394b59',
      }}
    >
      {/* Header (always visible) */}
      <div
        className="card-header d-flex align-items-center gap-3"
        style={{
          backgroundColor: '#243340',
          borderColor: '#394b59',
          cursor: 'pointer',
        }}
        onClick={handleToggle}
      >
        {/* Image */}
        {imagePath && (
          <img
            src={imagePath}
            alt={name}
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'cover',
              borderRadius: '4px',
            }}
          />
        )}

        {/* Name and subtitle */}
        <div className="flex-grow-1">
          <div className="text-light fw-medium">{name}</div>
          {subtitle && (
            <small className="text-muted">{subtitle}</small>
          )}
        </div>

        {/* Status badge */}
        <span
          className="badge"
          style={{
            backgroundColor: statusColors[status],
            color: status === 'skipped' ? '#000' : '#fff',
          }}
        >
          {statusLabels[status]}
        </span>

        {/* Expand indicator */}
        <span className="text-muted">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Body (collapsible) */}
      {expanded && children && (
        <div className="card-body">
          {children}
        </div>
      )}
    </div>
  );
};
