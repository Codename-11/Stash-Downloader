/**
 * QueueItem - Individual download item in the queue
 */

import React from 'react';
import type { IDownloadItem } from '@/types';
import { DownloadStatus } from '@/types';
import { formatBytes } from '@/utils';

interface QueueItemProps {
  item: IDownloadItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove, onEdit }) => {
  const getStatusBadge = () => {
    const statusConfig = {
      [DownloadStatus.Pending]: { text: 'Pending', class: 'bg-secondary' },
      [DownloadStatus.Downloading]: { text: 'Downloading', class: 'bg-primary' },
      [DownloadStatus.Processing]: { text: 'Processing', class: 'bg-info' },
      [DownloadStatus.Complete]: { text: 'Complete', class: 'bg-success' },
      [DownloadStatus.Failed]: { text: 'Failed', class: 'bg-danger' },
      [DownloadStatus.Cancelled]: { text: 'Cancelled', class: 'bg-warning' },
    };

    const config = statusConfig[item.status];
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getProgressBar = () => {
    if (!item.progress || item.status !== DownloadStatus.Downloading) {
      return null;
    }

    const { percentage, bytesDownloaded, totalBytes, speed } = item.progress;

    return (
      <div className="mt-2">
        <div className="progress" style={{ height: '20px' }}>
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            style={{ width: `${percentage}%` }}
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {percentage.toFixed(1)}%
          </div>
        </div>
        <small className="text-muted">
          {formatBytes(bytesDownloaded)} / {formatBytes(totalBytes)} ({formatBytes(speed)}/s)
        </small>
      </div>
    );
  };

  return (
    <div className="card mb-2">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <h6 className="card-title mb-1">
              {item.metadata?.title || 'Untitled'}
            </h6>
            <small className="text-muted d-block mb-2">{item.url}</small>
            {getStatusBadge()}
            {item.error && (
              <div className="alert alert-danger alert-sm mt-2 mb-0">
                {item.error}
              </div>
            )}
          </div>
          <div className="btn-group ms-3">
            {onEdit && item.status === DownloadStatus.Pending && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => onEdit(item.id)}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onRemove(item.id)}
              disabled={item.status === DownloadStatus.Downloading}
            >
              Remove
            </button>
          </div>
        </div>
        {getProgressBar()}
      </div>
    </div>
  );
};
