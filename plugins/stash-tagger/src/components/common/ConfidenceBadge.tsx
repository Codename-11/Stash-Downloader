/**
 * Badge showing match confidence level
 */

import React from 'react';
import type { ConfidenceLevel } from '@/types/matching';

interface ConfidenceBadgeProps {
  score: number;
  level?: ConfidenceLevel;
  showScore?: boolean;
}

const levelColors: Record<ConfidenceLevel, { bg: string; text: string }> = {
  high: { bg: '#198754', text: '#fff' },    // Bootstrap success green
  medium: { bg: '#ffc107', text: '#000' },  // Bootstrap warning yellow
  low: { bg: '#dc3545', text: '#fff' },     // Bootstrap danger red
};

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  level,
  showScore = true,
}) => {
  const confidenceLevel: ConfidenceLevel = level ?? (
    score >= 95 ? 'high' : score >= 70 ? 'medium' : 'low'
  );

  const colors = levelColors[confidenceLevel];

  return (
    <span
      className="badge"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: '0.75rem',
        fontWeight: 500,
      }}
    >
      {showScore ? `${score}%` : confidenceLevel}
    </span>
  );
};
