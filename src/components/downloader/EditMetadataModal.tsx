/**
 * EditMetadataModal - Simplified modal for previewing and importing
 */

import React, { useState, useEffect } from 'react';
import { MetadataEditorForm } from './MetadataEditorForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { IDownloadItem, PostImportAction } from '@/types';
import { DownloadStatus } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getStashImportService } from '@/services/stash';
import { formatBytes, formatDownloadError, createLogger, createImportCallbacks } from '@/utils';

const debugLog = createLogger('EditMetadataModal');

// Format seconds as "Xm Ys" or "Xs"
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

interface EditMetadataModalProps {
  item: IDownloadItem | null;
  open: boolean;
  onClose: () => void;
  onComplete: (itemId: string, stashId: string) => void;
  onUpdateItem?: (id: string, updates: Partial<IDownloadItem> | ((currentItem: IDownloadItem) => Partial<IDownloadItem>)) => void;
  onRemoveItem?: (id: string) => void;
  // Queue position for multi-item workflow
  queuePosition?: number;
  totalPending?: number;
  onSkip?: () => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  item,
  open,
  onClose,
  onComplete,
  onUpdateItem,
  onRemoveItem,
  queuePosition,
  totalPending,
  onSkip,
}) => {
  const toast = useToast();
  const log = useLog();
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Get current state from item
  const isImporting = item?.status === DownloadStatus.Processing || item?.status === DownloadStatus.Downloading;
  const isComplete = item?.status === DownloadStatus.Complete;
  const downloadProgress = item?.progress || null;
  const importStatus = item?.status === DownloadStatus.Downloading ? 'Downloading file...' :
                       item?.status === DownloadStatus.Processing ? 'Processing...' : 'Preparing...';

  // Track elapsed time during download
  useEffect(() => {
    if (!isImporting) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isImporting]);

  // Reset error when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const handleSave = async (editedMetadata: IDownloadItem['editedMetadata'], postImportAction: PostImportAction) => {
    if (!item || !onUpdateItem) return;

    // Update item with edited metadata and post-import action
    onUpdateItem(item.id, {
      editedMetadata,
      postImportAction,
      status: DownloadStatus.Processing,
    });

    setError(null);

    const itemTitle = editedMetadata?.title || item.metadata?.title || item.url;

    // Build import details for logging
    const importDetails: string[] = [
      `URL: ${item.url}`,
      `Post-import action: ${postImportAction}`,
    ];

    try {
      log.addLog('info', 'download', `Starting import: ${itemTitle}`, importDetails.join('\n'));

      const importService = getStashImportService();

      // Update item with edited metadata
      const itemWithMetadata: IDownloadItem = {
        ...item,
        editedMetadata,
        postImportAction,
        status: DownloadStatus.Processing,
      };

      // Set start time for reconnection tracking (preserve existing logs from scraping)
      onUpdateItem(item.id, {
        startedAt: new Date(),
        status: DownloadStatus.Processing,
      });

      // Modal stays open to show progress - will auto-advance on complete

      // Import to Stash with shared callback factory
      const callbacks = createImportCallbacks({
        itemId: item.id,
        updateItem: onUpdateItem,
        debugLog,
      });

      const result = await importService.importToStash(itemWithMetadata, callbacks);

      log.addLog('success', 'download', `Successfully imported: ${itemTitle}`, `Stash ID: ${result.id}`);
      toast.showToast('success', 'Import Successful', `Successfully imported: ${itemTitle}`);

      onComplete(item.id, result.id);
    } catch (err) {
      const errorStack = err instanceof Error ? err.stack : undefined;
      const formattedError = formatDownloadError(err, item.url);

      debugLog.error('Import error:', formattedError);
      log.addLog('error', 'download', `Failed to import: ${formattedError}`, errorStack || '');
      toast.showToast('error', 'Import Failed', formattedError);
      setError(formattedError);

      if (onUpdateItem) {
        const errorLog = {
          timestamp: new Date(),
          level: 'error' as const,
          message: `Import failed: ${formattedError}`,
          details: errorStack || '',
        };
        onUpdateItem(item.id, (currentItem) => ({
          status: DownloadStatus.Failed,
          error: formattedError,
          logs: [...(currentItem.logs || []), errorLog],
        }));
      }
    }
  };

  const handleRemove = () => {
    if (item && onRemoveItem) {
      onRemoveItem(item.id);
      onClose();
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  // Add/remove modal-open class on body
  useEffect(() => {
    if (open) {
      document.body.classList.add('modal-open');
      return () => {
        document.body.classList.remove('modal-open');
      };
    }
    return undefined;
  }, [open]);

  if (!item || !open) {
    return null;
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
          <div className="modal-content" style={{ backgroundColor: '#30404d', color: '#fff' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
              <div className="d-flex align-items-center gap-2">
                <h5 className="modal-title text-light mb-0">
                  {isComplete ? 'Import Details' : 'Import to Stash'}
                </h5>
                {queuePosition && totalPending && totalPending > 1 && (
                  <span className="badge bg-info" style={{ fontSize: '0.75rem' }}>
                    {queuePosition} of {totalPending}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCancel}
                aria-label="Close"
              ></button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {isImporting ? (
                <div className="py-5">
                  <div className="d-flex flex-column gap-3 align-items-center">
                    <LoadingSpinner size="lg" text={importStatus} />

                    <div className="w-100" style={{ maxWidth: '600px' }}>
                      <div className="d-flex flex-column gap-2">
                        <p className="text-center text-muted small mb-0">
                          {downloadProgress && downloadProgress.totalBytes > 0
                            ? `${downloadProgress.percentage.toFixed(1)}% - ${formatBytes(downloadProgress.bytesDownloaded)} / ${formatBytes(downloadProgress.totalBytes)}`
                            : downloadProgress && downloadProgress.bytesDownloaded > 0
                              ? `Downloaded: ${formatBytes(downloadProgress.bytesDownloaded)}`
                              : `Elapsed: ${formatElapsedTime(elapsedSeconds)}`}
                        </p>

                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar ${!downloadProgress || downloadProgress.totalBytes === 0 ? 'progress-bar-striped progress-bar-animated' : ''}`}
                            role="progressbar"
                            style={{ width: `${downloadProgress && downloadProgress.totalBytes > 0 ? downloadProgress.percentage : 100}%` }}
                          ></div>
                        </div>

                        {downloadProgress && downloadProgress.speed > 0 ? (
                          <p className="text-center text-muted small mb-0">
                            Speed: {formatBytes(downloadProgress.speed)}/s
                          </p>
                        ) : elapsedSeconds > 0 && (
                          <p className="text-center small mb-0" style={{ color: '#6c757d' }}>
                            ⏱ {formatElapsedTime(elapsedSeconds)} elapsed
                            {elapsedSeconds >= 5 && <span className="ms-2" style={{ color: '#28a745' }}>• Working...</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {error && (
                    <ErrorMessage
                      error={error}
                      onRetry={() => setError(null)}
                      onDismiss={() => setError(null)}
                    />
                  )}

                  <MetadataEditorForm
                    item={item}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onRemove={onRemoveItem ? handleRemove : undefined}
                    readOnly={isComplete}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
              <small className="flex-grow-1" style={{ color: '#8b9fad' }}>
                {isImporting ? 'Please wait...' : isComplete ? 'This item has been imported' : 'Review and import to Stash'}
              </small>
              {!isImporting && !isComplete && onSkip && totalPending && totalPending > 1 && (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={onSkip}
                  title="Skip to next pending item"
                >
                  Skip →
                </button>
              )}
              {isComplete && (
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={handleCancel}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
