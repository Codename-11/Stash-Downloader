/**
 * Skeleton Grid Component - Loading placeholder for results
 */

import React from 'react';

interface SkeletonGridProps {
  count?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ count = 12 }) => {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="col-6 col-sm-4 col-md-3 col-lg-2">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
};

const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card h-100">
      {/* Thumbnail skeleton */}
      <div className="skeleton-image" />

      {/* Body skeleton */}
      <div className="p-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="skeleton-text skeleton-text-sm" style={{ width: '40%' }} />
          <div className="d-flex gap-1">
            <div className="skeleton-button" style={{ width: '24px', height: '24px' }} />
            <div className="skeleton-button" style={{ width: '24px', height: '24px' }} />
          </div>
        </div>
        <div className="skeleton-text skeleton-text-sm" style={{ width: '60%' }} />
      </div>
    </div>
  );
};
