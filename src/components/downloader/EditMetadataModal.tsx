/**
 * EditMetadataModal - Modal for editing item metadata
 */

import React, { useState, useEffect } from 'react';
import { MetadataEditorForm } from './MetadataEditorForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { IDownloadItem } from '@/types';
import { DownloadStatus } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getStashImportService } from '@/services/stash';
import { formatBytes, formatDownloadError } from '@/utils';

interface EditMetadataModalProps {
  item: IDownloadItem | null;
  open: boolean;
  onClose: () => void;
  onComplete: (itemId: string, stashId: string) => void;
  onUpdateItem?: (id: string, updates: Partial<IDownloadItem>) => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  item,
  open,
  onClose,
  onComplete,
  onUpdateItem,
}) => {
  const toast = useToast();
  const log = useLog();
  const [error, setError] = useState<string | null>(null);

  // Get current state from item (persisted across modal open/close)
  const isImporting = item?.status === DownloadStatus.Processing || item?.status === DownloadStatus.Downloading;
  const downloadProgress = item?.progress || null;
  const importStatus = item?.status === DownloadStatus.Downloading ? 'Downloading file...' :
                       item?.status === DownloadStatus.Processing ? 'Processing...' : 'Preparing...';

  const handleSave = async (editedMetadata: IDownloadItem['editedMetadata']) => {
    if (!item || !onUpdateItem) return;

    // Update item status to processing
    onUpdateItem(item.id, {
      editedMetadata,
      status: DownloadStatus.Processing,
    });

    setError(null);

    const itemTitle = item.editedMetadata?.title || item.metadata?.title || item.url;

    try {
      log.addLog('info', 'download', `Starting import to Stash: ${itemTitle}`);

      const importService = getStashImportService();

      // Update item with edited metadata
      const itemWithMetadata = {
        ...item,
        editedMetadata,
        status: DownloadStatus.Processing,
      };

      // Initialize logs array if it doesn't exist
      onUpdateItem(item.id, {
        logs: [],
      });

      // Close modal immediately so import happens in background
      onClose();

      // Import to Stash with progress callbacks that update the queue item
      const result = await importService.importToStash(itemWithMetadata, {
        onProgress: (progress) => {
          // Update item progress in queue
          onUpdateItem(item.id, {
            progress,
            status: DownloadStatus.Downloading,
          });
        },
        onStatusChange: (status) => {
          // Update item status in queue
          const newStatus = status.includes('Downloading') ? DownloadStatus.Downloading : DownloadStatus.Processing;
          onUpdateItem(item.id, {
            status: newStatus,
          });
        },
        onLog: (level, message, details) => {
          // Add log entry to item's logs array
          const currentItem = item;
          const newLog = {
            timestamp: new Date(),
            level,
            message,
            details,
          };
          const existingLogs = currentItem.logs || [];
          onUpdateItem(item.id, {
            logs: [...existingLogs, newLog],
          });
        },
      });

      log.addLog('success', 'download', `Successfully imported to Stash: ${itemTitle}`, `Stash ID: ${result.id}`);
      toast.showToast('success', 'Import Successful', `Successfully imported: ${itemTitle}`);

      // Mark as complete
      onComplete(item.id, result.id);
    } catch (err) {
      const errorStack = err instanceof Error ? err.stack : undefined;
      const formattedError = formatDownloadError(err, item.url);

      // Log detailed error information
      console.error('[EditMetadataModal] Import error details:', {
        error: err,
        originalMessage: err instanceof Error ? err.message : String(err),
        formattedError,
        stack: errorStack,
        itemUrl: item.url,
        itemTitle: itemTitle,
        hasMetadata: !!item.metadata,
        videoUrl: item.metadata?.videoUrl,
      });

      log.addLog('error', 'download', `Failed to import to Stash: ${formattedError}`,
        `URL: ${item.url}\nVideo URL: ${item.metadata?.videoUrl || 'none'}\n${errorStack || ''}`
      );
      toast.showToast('error', 'Import Failed', formattedError);
      setError(formattedError);

      // Update item status to failed and add error log
      if (onUpdateItem) {
        const errorLog = {
          timestamp: new Date(),
          level: 'error' as const,
          message: `Import failed: ${formattedError}`,
          details: `URL: ${item.url}\nVideo URL: ${item.metadata?.videoUrl || 'none'}\n${errorStack || ''}`,
        };
        const existingLogs = item.logs || [];
        onUpdateItem(item.id, {
          status: DownloadStatus.Failed,
          error: formattedError,
          logs: [...existingLogs, errorLog],
        });
      }
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  // Add/remove modal-open class on body when modal opens/closes
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
              <h5 className="modal-title text-light">
                {item.status === DownloadStatus.Complete ? 'View Metadata' : 'Edit Metadata & Import'}
              </h5>
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

                    {downloadProgress && (
                      <div className="w-100" style={{ maxWidth: '600px' }}>
                        <div className="d-flex flex-column gap-2">
                          <p className="text-center text-muted small mb-0">
                            {downloadProgress.totalBytes > 0
                              ? `${downloadProgress.percentage.toFixed(1)}% - ${formatBytes(downloadProgress.bytesDownloaded)} / ${formatBytes(downloadProgress.totalBytes)}`
                              : `Downloaded: ${formatBytes(downloadProgress.bytesDownloaded)}`}
                          </p>

                          <div className="progress" style={{ height: '8px' }}>
                            <div
                              className={`progress-bar ${downloadProgress.totalBytes === 0 ? 'progress-bar-striped progress-bar-animated' : ''}`}
                              role="progressbar"
                              style={{ width: `${downloadProgress.totalBytes > 0 ? downloadProgress.percentage : 100}%` }}
                              aria-valuenow={downloadProgress.percentage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            ></div>
                          </div>

                          {downloadProgress.speed > 0 && (
                            <p className="text-center text-muted small mb-0">
                              Speed: {formatBytes(downloadProgress.speed)}/s
                              {downloadProgress.timeRemaining && downloadProgress.timeRemaining < 3600 && (
                                <> • ETA: {Math.ceil(downloadProgress.timeRemaining)}s</>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {/* Error display */}
                  {error && (
                    <ErrorMessage
                      error={error}
                      onRetry={() => setError(null)}
                      onDismiss={() => setError(null)}
                    />
                  )}

                  {/* URL display */}
                  <div className="alert" style={{ backgroundColor: '#243340', borderColor: '#394b59', color: '#8b9fad' }}>
                    <small style={{ wordBreak: 'break-all' }}>
                      <strong style={{ color: '#fff' }}>URL:</strong> {item.url}
                    </small>
                  </div>

                  {/* Metadata editor */}
                  <MetadataEditorForm
                    item={item}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
              <small className="flex-grow-1" style={{ color: '#8b9fad' }}>
                {isImporting ? 'Please wait...' : 'Review and edit metadata before importing to Stash'}
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
