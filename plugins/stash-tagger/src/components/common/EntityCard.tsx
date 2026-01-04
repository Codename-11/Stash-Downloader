/**
 * Generic entity card component (expandable)
 */

import React, { useState } from 'react';
import type { MatchStatus } from '@/types/matching';
import type { StashID } from '@/types';

interface EntityCardProps {
  id: string;
  name: string;
  imagePath?: string;
  status: MatchStatus;
  subtitle?: string;
  stashIds?: StashID[];
  /** Entity type for generating correct StashBox URLs */
  entityType?: 'studio' | 'performer' | 'tag';
  children?: React.ReactNode;
  onExpand?: () => void;
  defaultExpanded?: boolean;
}

/**
 * Get a friendly name for a StashBox endpoint
 */
function getEndpointName(endpoint: string): string {
  if (endpoint.includes('stashdb')) return 'StashDB';
  if (endpoint.includes('fansdb')) return 'FansDB';
  if (endpoint.includes('pmvstash')) return 'PMVStash';
  try {
    return new URL(endpoint).hostname;
  } catch {
    return endpoint;
  }
}

/**
 * Build a URL to view the entity on a StashBox instance
 */
function buildStashBoxUrl(endpoint: string, entityType: string, stashId: string): string {
  const baseUrl = endpoint.replace(/\/graphql$/, '');
  const typePath = entityType === 'performer' ? 'performers'
    : entityType === 'studio' ? 'studios'
    : 'tags';
  return `${baseUrl}/${typePath}/${stashId}`;
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
  stashIds,
  entityType = 'studio',
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

        {/* Name, subtitle, and stash IDs */}
        <div className="flex-grow-1">
          <div className="text-light fw-medium">{name}</div>
          {subtitle && (
            <small className="text-muted">{subtitle}</small>
          )}
          {/* StashBox IDs */}
          {stashIds && stashIds.length > 0 && (
            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
              {stashIds.map((sid) => (
                <a
                  key={sid.endpoint}
                  href={buildStashBoxUrl(sid.endpoint, entityType, sid.stash_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge bg-secondary me-1 text-decoration-none"
                  title={`${sid.endpoint}\nID: ${sid.stash_id}`}
                >
                  {getEndpointName(sid.endpoint)}
                </a>
              ))}
            </div>
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
          {/* Collapse button */}
          <div className="mt-3 pt-2 border-top" style={{ borderColor: '#394b59' }}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleToggle}
            >
              ▲ Collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
