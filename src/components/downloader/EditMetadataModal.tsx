/**
 * EditMetadataModal - Modal for editing item metadata
 */

import React, { useState, useEffect } from 'react';
import { MetadataEditorForm } from './MetadataEditorForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { RescrapeModal } from '@/components/common/RescrapeModal';
import type { IDownloadItem, IScrapedMetadata } from '@/types';
import { DownloadStatus } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getStashImportService } from '@/services/stash';
import { getScraperRegistry } from '@/services/metadata';
import { formatBytes, formatDownloadError, createLogger } from '@/utils';

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

interface ScraperInfo {
  name: string;
  canHandle: boolean;
  supportsContentType: boolean;
}

interface EditMetadataModalProps {
  item: IDownloadItem | null;
  open: boolean;
  onClose: () => void;
  onComplete: (itemId: string, stashId: string) => void;
  onUpdateItem?: (id: string, updates: Partial<IDownloadItem> | ((currentItem: IDownloadItem) => Partial<IDownloadItem>)) => void;
  // Queue position for multi-item workflow
  queuePosition?: number; // 1-indexed current position
  totalPending?: number; // Total pending items
  onSkip?: () => void; // Skip to next item
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  item,
  open,
  onClose,
  onComplete,
  onUpdateItem,
  queuePosition,
  totalPending,
  onSkip,
}) => {
  const toast = useToast();
  const log = useLog();
  const [error, setError] = useState<string | null>(null);

  // Re-scrape state
  const [rescrapeModalOpen, setRescrapeModalOpen] = useState(false);
  const [rescrapeScraperName, setRescrapeScraperName] = useState('');
  const [rescrapeNewMetadata, setRescrapeNewMetadata] = useState<IScrapedMetadata | undefined>(undefined);
  const [rescrapeLoading, setRescrapeLoading] = useState(false);
  const [rescrapeError, setRescrapeError] = useState<string | undefined>(undefined);
  const [availableScrapers, setAvailableScrapers] = useState<ScraperInfo[]>([]);
  const [formKey, setFormKey] = useState(0); // Key to force form re-initialization
  const [effectiveItem, setEffectiveItem] = useState<IDownloadItem | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Get current state from item (persisted across modal open/close)
  const isImporting = item?.status === DownloadStatus.Processing || item?.status === DownloadStatus.Downloading;
  const downloadProgress = item?.progress || null;
  const importStatus = item?.status === DownloadStatus.Downloading ? 'Downloading file...' :
                       item?.status === DownloadStatus.Processing ? 'Processing...' : 'Preparing...';

  // Update effective item when item prop changes
  useEffect(() => {
    if (item) {
      setEffectiveItem(item);
    }
  }, [item]);

  // Track elapsed time during download
  useEffect(() => {
    if (!isImporting) {
      setElapsedSeconds(0);
      return;
    }

    // Start timer
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isImporting]);

  // Load available scrapers when item changes
  useEffect(() => {
    if (item && open) {
      const scraperRegistry = getScraperRegistry();
      const scrapers = scraperRegistry.getAvailableScrapersForUrl(item.url, item.metadata?.contentType);
      setAvailableScrapers(scrapers);
    }
  }, [item, open]);

  // Reset re-scrape state when modal closes
  useEffect(() => {
    if (!open) {
      setRescrapeModalOpen(false);
      setRescrapeNewMetadata(undefined);
      setRescrapeError(undefined);
      setRescrapeLoading(false);
      setFormKey(0);
      setEffectiveItem(null);
    }
  }, [open]);

  // Handle re-scrape scraper selection
  const handleRescrapeClick = async (scraperName: string) => {
    if (!item) return;

    setRescrapeScraperName(scraperName);
    setRescrapeNewMetadata(undefined);
    setRescrapeError(undefined);
    setRescrapeLoading(true);
    setRescrapeModalOpen(true);

    try {
      const scraperRegistry = getScraperRegistry();
      const newMetadata = await scraperRegistry.scrapeWithScraper(item.url, scraperName);
      setRescrapeNewMetadata(newMetadata);
      setRescrapeLoading(false);
      log.addLog('success', 'scrape', `Re-scrape complete with ${scraperName}: ${newMetadata.title || item.url}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setRescrapeError(errorMsg);
      setRescrapeLoading(false);
      log.addLog('error', 'scrape', `Re-scrape failed with ${scraperName}: ${errorMsg}`);
    }
  };

  // Handle applying merged metadata from re-scrape modal
  const handleRescrapeApply = (mergedMetadata: IScrapedMetadata) => {
    if (!item) return;

    // Update the queue item with merged metadata
    if (onUpdateItem) {
      onUpdateItem(item.id, { metadata: mergedMetadata, error: undefined });
    }

    // Update effective item locally so form reflects changes
    setEffectiveItem(prev => prev ? { ...prev, metadata: mergedMetadata } : null);

    // Increment form key to force re-initialization
    setFormKey(prev => prev + 1);

    toast.showToast('success', 'Metadata Updated', `Applied merged metadata from ${rescrapeScraperName}`);
    log.addLog('success', 'scrape', `Applied merged metadata for: ${mergedMetadata.title || item.url}`);

    // Close re-scrape modal
    setRescrapeModalOpen(false);
    setRescrapeNewMetadata(undefined);
  };

  // Handle closing the re-scrape modal
  const handleRescrapeClose = () => {
    setRescrapeModalOpen(false);
    setRescrapeNewMetadata(undefined);
    setRescrapeError(undefined);
    setRescrapeLoading(false);
  };

  const handleSave = async (editedMetadata: IDownloadItem['editedMetadata']) => {
    if (!item || !onUpdateItem) return;

    // Update item status to processing
    onUpdateItem(item.id, {
      editedMetadata,
      status: DownloadStatus.Processing,
    });

    setError(null);

    const itemTitle = item.editedMetadata?.title || item.metadata?.title || item.url;

    // Build import details for logging
    const importDetails: string[] = [`URL: ${item.url}`];
    if (editedMetadata?.performers?.length) {
      importDetails.push(`Performers: ${editedMetadata.performers.map(p => p.name).join(', ')}`);
    }
    if (editedMetadata?.tags?.length) {
      importDetails.push(`Tags: ${editedMetadata.tags.length} selected`);
    }
    if (editedMetadata?.studio) {
      importDetails.push(`Studio: ${editedMetadata.studio.name}`);
    }
    if (item.metadata?.videoUrl) {
      importDetails.push(`Video URL: ${item.metadata.videoUrl.substring(0, 80)}...`);
    }

    try {
      log.addLog('info', 'download', `Starting import: ${itemTitle}`, importDetails.join('\n'));

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
          // Use functional update to avoid stale closure issues
          const newLog = {
            timestamp: new Date(),
            level,
            message,
            details,
          };
          onUpdateItem(item.id, (currentItem) => ({
            logs: [...(currentItem.logs || []), newLog],
          }));
        },
      });

      const successDetails = [
        `Stash ID: ${result.id}`,
        ...importDetails,
      ].join('\n');
      log.addLog('success', 'download', `Successfully imported: ${itemTitle}`, successDetails);
      toast.showToast('success', 'Import Successful', `Successfully imported: ${itemTitle}`);

      // Mark as complete
      onComplete(item.id, result.id);
    } catch (err) {
      const errorStack = err instanceof Error ? err.stack : undefined;
      const formattedError = formatDownloadError(err, item.url);

      // Log detailed error information
      debugLog.error('Import error details: ' + JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        formattedError,
        itemUrl: item.url,
        itemTitle: itemTitle,
        hasMetadata: !!item.metadata,
        videoUrl: item.metadata?.videoUrl,
      }));

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
        // Use functional update to avoid stale closure issues
        onUpdateItem(item.id, (currentItem) => ({
          status: DownloadStatus.Failed,
          error: formattedError,
          logs: [...(currentItem.logs || []), errorLog],
        }));
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
              <div className="d-flex align-items-center gap-2">
                <h5 className="modal-title text-light mb-0">
                  {item.status === DownloadStatus.Complete ? 'View Metadata' : 'Edit Metadata & Import'}
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
                        {/* Show elapsed time and progress info */}
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
                            aria-valuenow={downloadProgress?.percentage || 0}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          ></div>
                        </div>

                        {/* Show speed/ETA if available, otherwise show elapsed time below progress */}
                        {downloadProgress && downloadProgress.speed > 0 ? (
                          <p className="text-center text-muted small mb-0">
                            Speed: {formatBytes(downloadProgress.speed)}/s
                            {downloadProgress.timeRemaining && downloadProgress.timeRemaining < 3600 && (
                              <> • ETA: {Math.ceil(downloadProgress.timeRemaining)}s</>
                            )}
                          </p>
                        ) : elapsedSeconds > 0 && (
                          <p className="text-center small mb-0" style={{ color: '#6c757d' }}>
                            <span className="me-2">⏱</span>
                            {formatElapsedTime(elapsedSeconds)} elapsed
                            {elapsedSeconds >= 5 && <span className="ms-2" style={{ color: '#28a745' }}>• Working...</span>}
                          </p>
                        )}
                      </div>
                    </div>
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
                  {effectiveItem && (
                    <MetadataEditorForm
                      key={`form-${formKey}`}
                      item={effectiveItem}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      availableScrapers={item.status === DownloadStatus.Pending ? availableScrapers : undefined}
                      onRescrapeClick={item.status === DownloadStatus.Pending ? handleRescrapeClick : undefined}
                      isRescraping={rescrapeLoading}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
              <small className="flex-grow-1" style={{ color: '#8b9fad' }}>
                {isImporting ? 'Please wait...' : 'Review and edit metadata before importing to Stash'}
              </small>
              {!isImporting && (
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={handleCancel}
                >
                  Close
                </button>
              )}
              {onSkip && totalPending && totalPending > 1 && !isImporting && (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={onSkip}
                  title="Skip to next pending item"
                >
                  Skip →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Re-scrape Comparison Modal */}
      <RescrapeModal
        open={rescrapeModalOpen}
        onClose={handleRescrapeClose}
        originalMetadata={effectiveItem?.metadata}
        newMetadata={rescrapeNewMetadata}
        scraperName={rescrapeScraperName}
        onApply={handleRescrapeApply}
        isLoading={rescrapeLoading}
        error={rescrapeError}
      />
    </>
  );
};
