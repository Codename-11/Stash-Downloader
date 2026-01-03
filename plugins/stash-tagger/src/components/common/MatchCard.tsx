/**
 * Generic match candidate card
 */

import React from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';
import type { ConfidenceLevel } from '@/types/matching';

interface MatchCardProps {
  name: string;
  score: number;
  confidenceLevel: ConfidenceLevel;
  imageUrl?: string;
  aliases?: string[];
  details?: React.ReactNode;
  onApply: () => void;
  onSkip?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  name,
  score,
  confidenceLevel,
  imageUrl,
  aliases,
  details,
  onApply,
  onSkip,
  isSelected = false,
  disabled = false,
}) => {
  return (
    <div
      className="card mb-2"
      style={{
        backgroundColor: isSelected ? '#2a3f4f' : '#283845',
        borderColor: isSelected ? '#198754' : '#394b59',
        borderWidth: isSelected ? '2px' : '1px',
      }}
    >
      <div className="card-body p-2">
        <div className="d-flex gap-3">
          {/* Image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'cover',
                borderRadius: '4px',
              }}
            />
          )}

          {/* Content */}
          <div className="flex-grow-1">
            {/* Name and score */}
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="text-light fw-medium">{name}</span>
              <ConfidenceBadge score={score} level={confidenceLevel} />
            </div>

            {/* Aliases */}
            {aliases && aliases.length > 0 && (
              <div className="mb-1">
                <small className="text-muted">
                  Aliases: {aliases.slice(0, 3).join(', ')}
                  {aliases.length > 3 && ` +${aliases.length - 3} more`}
                </small>
              </div>
            )}

            {/* Additional details */}
            {details && (
              <div className="mt-1">
                {details}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="d-flex flex-column gap-1">
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={onApply}
              disabled={disabled}
            >
              Apply
            </button>
            {onSkip && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onSkip}
                disabled={disabled}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
