/**
 * QueuePage - Main download queue page
 */

import React, { useState, useEffect } from 'react';
import { InfoModal } from '@/components/common/InfoModal';
import { ItemLogModal } from '@/components/common/ItemLogModal';
import { URLInputForm } from './URLInputForm';
import { QueueItem } from './QueueItem';
import { BatchImport } from './BatchImport';
import { EditMetadataModal } from './EditMetadataModal';
import { LogViewer } from '@/components/common';
import { useDownloadQueue } from '@/hooks';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getScraperRegistry } from '@/services/metadata';
import { getDownloadService, getBrowserDownloadService } from '@/services/download';
import { DownloadStatus, ContentType } from '@/types';
import type { IDownloadItem } from '@/types';
import { checkYtDlpAvailable } from '@/utils/systemCheck';
import logoSvg from '@/assets/logo.svg';

interface QueuePageProps {
  isTestMode?: boolean;
  testSettingsPanel?: React.ReactNode;
}

export const QueuePage: React.FC<QueuePageProps> = ({ isTestMode = false, testSettingsPanel }) => {
  const queue = useDownloadQueue();
  const toast = useToast();
  const log = useLog();
  const scraperRegistry = getScraperRegistry();
  const [editingItem, setEditingItem] = useState<IDownloadItem | null>(null);
  const [viewingLogsForItem, setViewingLogsForItem] = useState<IDownloadItem | null>(null);
  const [urlFieldValue, setUrlFieldValue] = useState('');
  const [showYtDlpWarning, setShowYtDlpWarning] = useState(false);

  // Check for yt-dlp on component mount
  useEffect(() => {
    const checkYtDlp = async () => {
      // Only check once per session
      const alreadyChecked = sessionStorage.getItem('ytdlp-checked');
      if (alreadyChecked) {
        return;
      }

      // Check if CORS proxy is enabled first
      const corsEnabled = localStorage.getItem('corsProxyEnabled') === 'true';
      if (!corsEnabled) {
        console.log('[QueuePage] CORS proxy not enabled, skipping yt-dlp check');
        sessionStorage.setItem('ytdlp-checked', 'true');
        return;
      }

      console.log('[QueuePage] Checking if yt-dlp is available...');
      const isAvailable = await checkYtDlpAvailable();

      if (!isAvailable) {
        console.log('[QueuePage] yt-dlp not available, showing warning');
        setShowYtDlpWarning(true);
      } else {
        console.log('[QueuePage] yt-dlp is available');
      }

      sessionStorage.setItem('ytdlp-checked', 'true');
    };

    checkYtDlp();
  }, []);

  const handleAddUrl = async (url: string) => {
    // Clear URL field after adding
    setUrlFieldValue('');
    
    // Add to queue immediately for better UX
    const itemId = queue.addToQueue(url);
    log.addLog('info', 'scrape', `Added URL to queue: ${url}`);
    
    // Scrape metadata in background and update the item
    (async () => {
      try {
        console.log(`[QueuePage] ========================================`);
        console.log(`[QueuePage] Starting metadata scrape for: ${url}`);
        console.log(`[QueuePage] Item ID: ${itemId}`);
        console.log(`[QueuePage] Current queue items:`, queue.items.length);
        console.log(`[QueuePage] ========================================`);
        log.addLog('info', 'scrape', `Starting metadata scrape for: ${url}`);
        
        // Note: We don't need to find the item - React state updates are async
        // We can update it directly using the itemId
        
        // Scrape metadata from URL
        console.log(`[QueuePage] Calling scraperRegistry.scrape()...`);
        const metadata = await scraperRegistry.scrape(url);
        console.log(`[QueuePage] Scraping completed, metadata:`, {
          title: metadata.title,
          hasVideoUrl: !!metadata.videoUrl,
          hasImageUrl: !!metadata.imageUrl,
          contentType: metadata.contentType,
        });
        
        // Update the queue item with scraped metadata
        console.log(`[QueuePage] Updating item ${itemId} with metadata...`);
        queue.updateItem(itemId, {
          metadata,
        });
        console.log(`[QueuePage] Item updated successfully`);
        
        log.addLog('success', 'scrape', `Successfully scraped metadata: ${metadata.title || url}`, 
          `Title: ${metadata.title || 'N/A'}\n` +
          `Description: ${metadata.description ? metadata.description.substring(0, 100) + '...' : 'N/A'}\n` +
          `Thumbnail: ${metadata.thumbnailUrl || 'N/A'}\n` +
          `Duration: ${metadata.duration ? metadata.duration + 's' : 'N/A'}\n` +
          `Performers: ${metadata.performers?.length || 0}\n` +
          `Tags: ${metadata.tags?.length || 0}\n` +
          `Content Type: ${metadata.contentType}\n` +
          `Video URL: ${metadata.videoUrl ? 'Extracted ✓' : 'Not available'}\n` +
          `Image URL: ${metadata.imageUrl ? 'Extracted ✓' : 'Not available'}`
        );
        
        if (metadata.videoUrl) {
          console.log('[QueuePage] ✓ Scraper extracted videoUrl:', metadata.videoUrl.substring(0, 100) + '...');
        } else if (metadata.imageUrl) {
          console.log('[QueuePage] ✓ Scraper extracted imageUrl:', metadata.imageUrl.substring(0, 100) + '...');
        } else {
          console.warn('[QueuePage] ⚠️ Scraper did not extract videoUrl or imageUrl - download may fail');
        }
        toast.showToast('success', 'Metadata Scraped', `Successfully scraped metadata for ${metadata.title || url}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorDetails = error instanceof Error ? 
          `Error: ${errorMessage}\n\nStack trace:\n${errorStack || 'No stack trace available'}` :
          `Error: ${String(error)}`;
        
        console.error('[QueuePage] Scraping failed with full details:', {
          url,
          errorMessage,
          errorStack,
          error,
        });
        
        log.addLog('error', 'scrape', `Failed to scrape metadata: ${errorMessage}`, errorDetails);
        toast.showToast('warning', 'Scrape Failed', `Failed to scrape metadata: ${errorMessage}. Item added to queue without metadata.`);
        
        // Update item with error so user knows scraping failed
        queue.updateItem(itemId, {
          error: `Scraping failed: ${errorMessage}`,
        });
        
        // Item is already in queue, just log that metadata scraping failed
        log.addLog('info', 'scrape', `Item remains in queue without metadata: ${url}`);
      }
    })();
  };

  const handleBatchImport = async (urls: string[]) => {
    log.addLog('info', 'scrape', `Starting batch import of ${urls.length} URLs`);
    toast.showToast('info', 'Batch Import Started', `Processing ${urls.length} URLs...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const url of urls) {
      try {
        await handleAddUrl(url);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    log.addLog('success', 'scrape', `Batch import complete: ${successCount} succeeded, ${errorCount} failed`);
    toast.showToast(
      errorCount > 0 ? 'warning' : 'success',
      'Batch Import Complete',
      `${successCount} succeeded, ${errorCount} failed`
    );
  };

  const handleCompleteImport = (itemId: string, stashId: string) => {
    queue.updateItem(itemId, {
      status: DownloadStatus.Complete,
      stashId,
      completedAt: new Date(),
    });
  };

  const handleDirectDownload = async (itemId: string) => {
    const item = queue.items.find((i) => i.id === itemId);
    if (!item) return;

    queue.updateItem(itemId, {
      status: DownloadStatus.Downloading,
      startedAt: new Date(),
    });

    try {
      log.addLog('info', 'download', `Starting direct download: ${item.metadata?.title || item.url}`);
      
      // Log available URLs based on content type
      if (item.metadata?.contentType === ContentType.Image) {
        if (item.metadata?.imageUrl) {
          log.addLog('info', 'download', `Scraped imageUrl available: ${item.metadata.imageUrl.substring(0, 100)}...`);
        } else {
          log.addLog('info', 'download', 'Downloading image from page URL directly');
        }
      } else {
        if (item.metadata?.videoUrl) {
          log.addLog('info', 'download', `Scraped videoUrl available for fallback: ${item.metadata.videoUrl.substring(0, 100)}...`);
        } else {
          log.addLog('warning', 'download', 'No scraped videoUrl available - yt-dlp must succeed or download will fail');
        }
      }
      
      const downloadService = getDownloadService();
      const browserDownloadService = getBrowserDownloadService();
      
      // Download the file - use scraped videoUrl if available as fallback
      const blob = await downloadService.download(
        item.url,
        {
          onProgress: (progress) => {
            queue.updateItem(itemId, {
              progress,
            });
          },
        },
        item.metadata?.videoUrl, // Pass scraped videoUrl for videos
        item.metadata?.imageUrl  // Pass scraped imageUrl for images
      );

      log.addLog('success', 'download', `Download complete: ${item.metadata?.title || item.url}`, `File size: ${blob.size} bytes`);

      // Save to browser downloads with metadata
      await browserDownloadService.downloadWithMetadata(
        {
          ...item,
          editedMetadata: {
            title: item.metadata?.title,
            description: item.metadata?.description,
            date: item.metadata?.date,
          },
        },
        blob,
        { id: itemId } as any // Mock stash result for test mode
      );

      toast.showToast('success', 'Download Complete', `Downloaded: ${item.metadata?.title || item.url}`);
      
      queue.updateItem(itemId, {
        status: DownloadStatus.Complete,
        completedAt: new Date(),
        fileSize: blob.size,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Download failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorDetails = error instanceof Error ? 
        `Error: ${errorMsg}\n\nStack trace:\n${errorStack || 'No stack trace available'}` :
        `Error: ${String(error)}`;
      
      console.error('[QueuePage] Download failed with full details:', {
        itemId,
        url: item.url,
        errorMsg,
        errorStack,
        error,
      });
      
      log.addLog('error', 'download', `Direct download failed: ${errorMsg}`, errorDetails);
      toast.showToast('error', 'Download Failed', errorMsg);
      
      queue.updateItem(itemId, {
        status: DownloadStatus.Failed,
        error: errorMsg,
      });
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-light bg-light border-bottom">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-3 flex-grow-1">
            <img
              src={logoSvg}
              alt="Stash Downloader Logo"
              style={{ width: '40px', height: '40px' }}
            />
            <h6 className="mb-0">Stash Downloader</h6>
          </div>
          {isTestMode && (
            <span className="badge bg-warning me-2">DEVELOPMENT MODE</span>
          )}
        </div>
      </nav>
      <div className="container-lg py-4">
        <div className="d-flex flex-column gap-3">
          {/* Test settings panel in test mode */}
          {isTestMode && testSettingsPanel}

          <URLInputForm
            onSubmit={handleAddUrl}
            initialValue={urlFieldValue}
            onValueChange={setUrlFieldValue}
          />

          {/* Batch Import */}
          <div className="mb-3">
            <BatchImport
              onImport={handleBatchImport}
              onSingleUrl={(url) => {
                setUrlFieldValue(url);
              }}
            />
          </div>

          {/* Queue Statistics */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-around align-items-center">
                <div className="text-center">
                  <h5 className="mb-0">{queue.stats.total}</h5>
                  <small className="text-muted">Total</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-primary">{queue.stats.downloading}</h5>
                  <small className="text-muted">Downloading</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-success">{queue.stats.complete}</h5>
                  <small className="text-muted">Complete</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-danger">{queue.stats.failed}</h5>
                  <small className="text-muted">Failed</small>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {queue.items.length > 0 && (
            <div className="d-flex gap-2 mb-3">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const firstPending = queue.items.find(item => item.status === DownloadStatus.Pending);
                  if (firstPending) setEditingItem(firstPending);
                }}
                disabled={queue.stats.pending === 0}
              >
                📝 Edit & Import ({queue.stats.pending} items)
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={queue.clearCompleted}
                disabled={queue.stats.complete === 0}
              >
                Clear Completed
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={queue.clearAll}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Queue Items */}
          {queue.items.length === 0 ? (
            <div className="text-center py-5">
              <h5 className="text-muted mb-2">No downloads in queue</h5>
              <small className="text-muted">Enter a URL above to get started</small>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {queue.items.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  onRemove={queue.removeFromQueue}
                  onEdit={(id) => {
                    // Find item and open edit modal
                    const itemToEdit = queue.items.find((i) => i.id === id);
                    if (itemToEdit) {
                      setEditingItem(itemToEdit);
                    }
                  }}
                  onDownload={handleDirectDownload}
                  onViewLogs={(id) => {
                    // Find item and open logs modal
                    const itemToView = queue.items.find((i) => i.id === id);
                    if (itemToView) {
                      setViewingLogsForItem(itemToView);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Activity Log */}
          <LogViewer />
        </div>
      </div>

      {/* Edit Metadata Modal */}
      <EditMetadataModal
        item={editingItem}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        onComplete={handleCompleteImport}
        onUpdateItem={queue.updateItem}
      />

      {/* yt-dlp Warning Modal */}
      <InfoModal
        open={showYtDlpWarning}
        onClose={() => setShowYtDlpWarning(false)}
        title="yt-dlp Not Installed"
        severity="warning"
        maxWidth="md"
      >
        <div className="d-flex flex-column gap-3">
          <div className="alert alert-info">
            <strong>yt-dlp</strong> is a powerful video extraction tool that provides the highest quality downloads from hundreds of sites.
          </div>

          <p className="mb-0">
            <strong>What's happening:</strong>
          </p>
          <div>
            • yt-dlp is not detected on your system<br />
            • The app will fall back to built-in scrapers (YouPornScraper, PornhubScraper)<br />
            • Built-in scrapers may only extract <strong>lower quality videos</strong> (360p-480p)<br />
            • Some sites may not work at all without yt-dlp
          </div>

          <p className="mb-0 mt-2">
            <strong>To install yt-dlp:</strong>
          </p>
          <pre className="bg-dark text-light p-3 rounded" style={{ overflow: 'auto' }}>
            <code>
              # Using pip (recommended){'\n'}
              pip install yt-dlp{'\n\n'}
              # Or using pipx (isolated install){'\n'}
              pipx install yt-dlp{'\n\n'}
              # Verify installation{'\n'}
              yt-dlp --version
            </code>
          </pre>

          <small className="text-muted">
            <strong>Note:</strong> You may need to restart the dev server after installing yt-dlp for changes to take effect.
          </small>

          <div className="alert alert-success">
            <small>
              <strong>Alternative:</strong> Download the standalone executable from{' '}
              <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer">
                github.com/yt-dlp/yt-dlp/releases
              </a>
              {' '}and add it to your system PATH.
            </small>
          </div>
        </div>
      </InfoModal>

      {/* Item Log Modal */}
      <ItemLogModal
        open={!!viewingLogsForItem}
        onClose={() => setViewingLogsForItem(null)}
        title={viewingLogsForItem?.metadata?.title || viewingLogsForItem?.url || ''}
        logs={viewingLogsForItem?.logs || []}
      />
    </div>
  );
};
