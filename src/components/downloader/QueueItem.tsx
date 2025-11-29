/**
 * QueueItem - Individual download item in the queue
 */

import React from 'react';
import { MediaPreviewModal } from '@/components/common';
import type { IDownloadItem } from '@/types';
import { DownloadStatus, ContentType } from '@/types';
import { formatBytes } from '@/utils';

interface QueueItemProps {
  item: IDownloadItem;
  onRemove: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
  onViewLogs?: (id: string) => void;
  showThumbnail?: boolean;
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove, onEdit, onDownload, onViewLogs, showThumbnail = true }) => {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewType, setPreviewType] = React.useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = React.useState('');

  const handlePreview = (url: string, type: 'image' | 'video') => {
    setPreviewUrl(url);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const getStatusChip = () => {
    const statusConfig = {
      [DownloadStatus.Pending]: { label: 'Pending', color: 'bg-secondary' },
      [DownloadStatus.Downloading]: { label: 'Downloading', color: 'bg-primary' },
      [DownloadStatus.Processing]: { label: 'Processing', color: 'bg-info' },
      [DownloadStatus.Complete]: { label: 'Complete', color: 'bg-success' },
      [DownloadStatus.Failed]: { label: 'Failed', color: 'bg-danger' },
      [DownloadStatus.Cancelled]: { label: 'Cancelled', color: 'bg-warning' },
    };

    const config = statusConfig[item.status];
    return <span className={`badge ${config.color}`}>{config.label}</span>;
  };

  const getProgressBar = () => {
    // Show progress during downloading or processing
    const showProgress = item.status === DownloadStatus.Downloading ||
                        (item.status === DownloadStatus.Processing && item.progress);

    if (!showProgress) {
      return null;
    }

    // If we have progress data, show it
    if (item.progress) {
      const { percentage, bytesDownloaded, totalBytes, speed } = item.progress;

      return (
        <div className="mt-2">
          <div className="progress" style={{ height: '8px' }}>
            <div
              className={`progress-bar ${totalBytes === 0 ? 'progress-bar-striped progress-bar-animated' : ''}`}
              role="progressbar"
              style={{ width: `${totalBytes > 0 ? percentage : 100}%` }}
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
          <small className="text-muted d-block mt-1">
            {totalBytes > 0
              ? `${formatBytes(bytesDownloaded)} / ${formatBytes(totalBytes)} (${formatBytes(speed)}/s)`
              : `Downloaded: ${formatBytes(bytesDownloaded)} (${formatBytes(speed)}/s)`
            }
          </small>
        </div>
      );
    }

    // No progress data but status is downloading/processing - show indeterminate
    return (
      <div className="mt-2">
        <div className="progress" style={{ height: '8px' }}>
          <div className="progress-bar progress-bar-striped progress-bar-animated w-100" role="progressbar"></div>
        </div>
        <small className="text-muted d-block mt-1">
          {item.status === DownloadStatus.Downloading ? 'Downloading...' : 'Processing...'}
        </small>
      </div>
    );
  };

  const isScrapingMetadata = !item.metadata && !item.error && item.status === DownloadStatus.Pending;

  return (
    <div className="card text-light mb-3" style={{ backgroundColor: '#30404d' }}>
      <div className="card-body">
        <div className="d-flex gap-3 align-items-start">
          {/* Thumbnail preview, skeleton, or placeholder */}
          {!showThumbnail ? (
            // Thumbnails disabled - show compact placeholder with icon
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: '48px',
                height: '48px',
                flexShrink: 0,
                backgroundColor: '#243340',
                borderRadius: '4px',
                border: '1px solid #394b59',
              }}
            >
              <span style={{ fontSize: '20px', opacity: 0.6 }}>
                {item.metadata?.contentType === ContentType.Image ? '🖼️' : '🎬'}
              </span>
            </div>
          ) : isScrapingMetadata ? (
            // Loading skeleton with spinner
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                width: '120px',
                height: '80px',
                flexShrink: 0,
                backgroundColor: '#243340',
                borderRadius: '4px',
                border: '1px solid #394b59',
              }}
            >
              <div className="spinner-border spinner-border-sm text-info" role="status" aria-label="Loading"></div>
            </div>
          ) : item.metadata?.thumbnailUrl ? (
            <img
              src={item.metadata.thumbnailUrl}
              alt="Preview"
              style={{
                maxHeight: '80px',
                maxWidth: '120px',
                objectFit: 'cover',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid #394b59',
                flexShrink: 0,
                transition: 'transform 0.2s',
              }}
              onClick={() => item.metadata?.thumbnailUrl && handlePreview(item.metadata.thumbnailUrl, 'image')}
              onError={(e) => {
                // Try to use CORS proxy if image fails to load
                const img = e.target as HTMLImageElement;
                const originalSrc = item.metadata?.thumbnailUrl;
                if (originalSrc && !originalSrc.includes('localhost:8080')) {
                  const corsProxyEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
                  const corsProxyUrl = localStorage.getItem('corsProxyUrl') || 'http://localhost:8080';
                  if (corsProxyEnabled) {
                    const proxiedUrl = `${corsProxyUrl}/${originalSrc}`;
                    console.log('[QueueItem] Thumbnail failed, trying CORS proxy:', proxiedUrl);
                    img.src = proxiedUrl;
                  } else {
                    // Show placeholder instead of hiding
                    img.style.display = 'none';
                    const placeholder = img.parentElement?.querySelector('.thumbnail-placeholder');
                    if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                  }
                } else {
                  img.style.display = 'none';
                  const placeholder = img.parentElement?.querySelector('.thumbnail-placeholder');
                  if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                }
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Click to view full size"
            />
          ) : (
            // Default placeholder when no thumbnail
            <div
              className="d-flex align-items-center justify-content-center thumbnail-placeholder"
              style={{
                width: '120px',
                height: '80px',
                flexShrink: 0,
                backgroundColor: '#243340',
                borderRadius: '4px',
                border: '1px solid #394b59',
              }}
            >
              <span style={{ fontSize: '24px', opacity: 0.5 }}>
                {item.metadata?.contentType === ContentType.Image ? '🖼️' : '🎬'}
              </span>
            </div>
          )}
          <div className="flex-grow-1">
            {/* Title section */}
            <div className="d-flex gap-2 align-items-center mb-2">
              {isScrapingMetadata ? (
                <div className="d-flex gap-2 align-items-center">
                  <div className="spinner-border spinner-border-sm text-info" role="status" aria-label="Loading"></div>
                  <span style={{ color: '#8b9fad' }}>Scraping metadata...</span>
                </div>
              ) : item.metadata?.title ? (
                <h6 className="mb-0">{item.metadata.title}</h6>
              ) : item.error ? (
                <div className="text-danger">
                  <small>Scraping failed: {item.error}</small>
                </div>
              ) : null}
            </div>

            {/* URL */}
            <small className="text-muted d-block mb-2">
              {item.url}
            </small>

            {/* Status and metadata chips */}
            <div className="d-flex gap-2 align-items-center mb-2">
              {getStatusChip()}
              {isScrapingMetadata ? null : (
                item.metadata?.contentType && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: item.metadata.contentType === ContentType.Image ? 'rgba(108, 117, 125, 0.2)' : 'rgba(13, 110, 253, 0.2)',
                      color: item.metadata.contentType === ContentType.Image ? '#adb5bd' : '#6ea8fe',
                      border: `1px solid ${item.metadata.contentType === ContentType.Image ? '#6c757d' : '#0d6efd'}`,
                    }}
                  >
                    {item.metadata.contentType === ContentType.Image ? '🖼️ Image' : '🎥 Video'}
                  </span>
                )
              )}
            </div>
            {item.error && (
              <small className="text-danger mt-2 d-block">
                {item.error}
              </small>
            )}
          </div>
          <div className="d-flex gap-1 flex-wrap">
            {onDownload && item.status === DownloadStatus.Pending && (
              <button
                className="btn btn-sm btn-success"
                onClick={() => onDownload(item.id)}
                title="Download directly without editing metadata"
              >
                ⬇️ Download
              </button>
            )}
            {onEdit && (
              <button
                className="btn btn-sm btn-outline-light"
                onClick={() => onEdit(item.id)}
                title={item.status === DownloadStatus.Complete ? "View metadata" : "Edit metadata & import"}
                disabled={item.status === DownloadStatus.Downloading || item.status === DownloadStatus.Processing}
              >
                {item.status === DownloadStatus.Complete ? '👁️ View' : '📝 Edit'}
              </button>
            )}
            {item.metadata?.videoUrl && item.metadata?.contentType === ContentType.Video && (
              <button
                className="btn btn-sm btn-link text-info p-1"
                onClick={() => item.metadata?.videoUrl && handlePreview(item.metadata.videoUrl, 'video')}
                title="Preview video"
              >
                ▶️
              </button>
            )}
            {onViewLogs && item.logs && item.logs.length > 0 && (
              <button
                className="btn btn-sm btn-outline-light position-relative"
                onClick={() => onViewLogs(item.id)}
                title="View download logs"
              >
                📄 Logs
                {item.logs.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary">
                    {item.logs.length > 99 ? '99+' : item.logs.length}
                  </span>
                )}
              </button>
            )}
            <button
              className="btn btn-sm btn-link text-danger p-1"
              onClick={() => onRemove(item.id)}
              disabled={item.status === DownloadStatus.Downloading}
              title="Remove"
            >
              🗑️
            </button>
          </div>
        </div>
        {getProgressBar()}
      </div>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mediaUrl={previewUrl}
        mediaType={previewType}
        alt={item.metadata?.title || 'Preview'}
      />
    </div>
  );
};
