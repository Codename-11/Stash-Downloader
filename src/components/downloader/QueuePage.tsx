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
import { getStashService } from '@/services/stash/StashGraphQLService';
import { DownloadStatus, ContentType } from '@/types';
import type { IDownloadItem } from '@/types';
import { checkYtDlpAvailable } from '@/utils/systemCheck';
import { formatDownloadError } from '@/utils/helpers';
import { useSettings } from '@/hooks';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '@/constants';
import { getStorageItem } from '@/utils';
import type { IPluginSettings } from '@/types';
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
  const { settings } = useSettings();
  const stashService = getStashService();
  const isStashEnvironment = stashService.isStashEnvironment();
  const [editingItem, setEditingItem] = useState<IDownloadItem | null>(null);
  const [viewingLogsForItem, setViewingLogsForItem] = useState<IDownloadItem | null>(null);
  const [urlFieldValue, setUrlFieldValue] = useState('');
  const [showYtDlpWarning, setShowYtDlpWarning] = useState(false);
  
  // Get proxy info for display
  const httpProxy = settings.httpProxy;
  const serverDownloadPath = settings.serverDownloadPath || DEFAULT_SETTINGS.serverDownloadPath;
  
  // Listen for settings changes from Stash's Settings UI
  useEffect(() => {
    if (!isStashEnvironment) return;
    
    // Check settings on mount and log current proxy status
    const currentSettings = getStorageItem<IPluginSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (currentSettings.httpProxy) {
      const masked = currentSettings.httpProxy.replace(/:[^:@]*@/, ':****@');
      console.log(`[Settings] Current HTTP/SOCKS proxy: ${masked}`);
    } else {
      console.log('[Settings] HTTP/SOCKS proxy not configured');
    }
    
    // Listen for cross-tab storage changes (when settings are updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue) as IPluginSettings;
          const oldSettings = JSON.parse(e.oldValue || '{}') as IPluginSettings;
          
          // Check if proxy changed
          if (newSettings.httpProxy !== oldSettings.httpProxy) {
            if (newSettings.httpProxy) {
              const masked = newSettings.httpProxy.replace(/:[^:@]*@/, ':****@');
              console.log(`[Settings] HTTP/SOCKS proxy updated via Stash Settings UI: ${masked}`);
            } else {
              console.log('[Settings] HTTP/SOCKS proxy removed via Stash Settings UI');
            }
          }
          
          // Check if server download path changed
          if (newSettings.serverDownloadPath !== oldSettings.serverDownloadPath) {
            console.log(`[Settings] Server download path updated: ${oldSettings.serverDownloadPath || 'default'} → ${newSettings.serverDownloadPath || 'default'}`);
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
    };
    
    // Also check periodically for same-tab changes (Stash may update localStorage directly)
    const checkInterval = setInterval(() => {
      const latestSettings = getStorageItem<IPluginSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      if (latestSettings.httpProxy !== httpProxy) {
        if (latestSettings.httpProxy) {
          const masked = latestSettings.httpProxy.replace(/:[^:@]*@/, ':****@');
          console.log(`[Settings] HTTP/SOCKS proxy changed (detected via polling): ${masked}`);
        } else {
          console.log('[Settings] HTTP/SOCKS proxy removed (detected via polling)');
        }
      }
    }, 2000); // Check every 2 seconds
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, [isStashEnvironment, httpProxy]);

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
          // This is normal for Stash's built-in scraper - it doesn't return direct video URLs
          // The download service will use yt-dlp or the page URL as fallback
          console.log('[QueuePage] ℹ️ No direct video/image URL extracted - download service will use yt-dlp or page URL');
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
      const errorStack = error instanceof Error ? error.stack : undefined;
      const formattedError = formatDownloadError(error, item.url);
      const errorDetails = error instanceof Error ? 
        `Error: ${formattedError}\n\nStack trace:\n${errorStack || 'No stack trace available'}` :
        `Error: ${formattedError}`;
      
      console.error('[QueuePage] Download failed with full details:', {
        itemId,
        url: item.url,
        originalError: error instanceof Error ? error.message : String(error),
        formattedError,
        errorStack,
        error,
      });
      
      log.addLog('error', 'download', `Direct download failed: ${formattedError}`, errorDetails);
      toast.showToast('error', 'Download Failed', formattedError);
      
      queue.updateItem(itemId, {
        status: DownloadStatus.Failed,
        error: formattedError,
      });
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header - only shown in test mode, Stash provides its own header */}
      {isTestMode && (
        <nav className="navbar navbar-dark bg-dark border-bottom border-secondary">
          <div className="container-fluid">
            <div className="d-flex align-items-center gap-3 flex-grow-1">
              <img
                src={logoSvg}
                alt="Stash Downloader Logo"
                style={{ width: '40px', height: '40px' }}
              />
              <h6 className="mb-0 text-light">Stash Downloader</h6>
            </div>
            <span className="badge bg-warning me-2">DEVELOPMENT MODE</span>
          </div>
        </nav>
      )}
      <div className="container-lg py-4">
        <div className="d-flex flex-column gap-3">
          {/* Logo and title when not in test mode (Stash context) */}
          {!isTestMode && (
            <div className="d-flex align-items-center gap-3 mb-2" style={{ border: '1px dashed rgba(255,255,255,0.3)', padding: '8px', borderRadius: '4px', width: 'fit-content' }}>
              <img
                src={logoSvg}
                alt="Stash Downloader Logo"
                style={{ width: '40px', height: '40px' }}
              />
            </div>
          )}

          {/* Test settings panel in test mode */}
          {isTestMode && testSettingsPanel}

          {/* Proxy and Server Status (Stash mode only) */}
          {!isTestMode && isStashEnvironment && (
            <div className="card text-light mb-3" style={{ backgroundColor: '#30404d', borderColor: '#394b59' }}>
              <div className="card-header" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
                <h6 className="mb-0">Server Configuration</h6>
              </div>
              <div className="card-body">
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ color: '#8b9fad' }}>Server Download Path:</span>
                    <code className="text-light">{serverDownloadPath}</code>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span style={{ color: '#8b9fad' }}>HTTP/SOCKS Proxy:</span>
                    {httpProxy ? (
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-success">Enabled</span>
                        <code className="text-light" style={{ fontSize: '0.85em' }}>
                          {httpProxy.replace(/:[^:@]*@/, ':****@')}
                        </code>
                      </div>
                    ) : (
                      <span className="badge bg-secondary">Not Configured</span>
                    )}
                  </div>
                  {httpProxy && (
                    <small className="text-muted" style={{ color: '#8b9fad' }}>
                      ℹ️ Proxy will be used for server-side downloads and metadata extraction. SSL certificate verification is disabled when using proxy.
                    </small>
                  )}
                </div>
              </div>
            </div>
          )}

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
          <div className="card text-light mb-3" style={{ backgroundColor: '#30404d' }}>
            <div className="card-body">
              <div className="d-flex justify-content-around align-items-center">
                <div className="text-center">
                  <h5 className="mb-0">{queue.stats.total}</h5>
                  <small style={{ color: '#8b9fad' }}>Total</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-info">{queue.stats.downloading}</h5>
                  <small style={{ color: '#8b9fad' }}>Downloading</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-success">{queue.stats.complete}</h5>
                  <small style={{ color: '#8b9fad' }}>Complete</small>
                </div>
                <div className="text-center">
                  <h5 className="mb-0 text-danger">{queue.stats.failed}</h5>
                  <small style={{ color: '#8b9fad' }}>Failed</small>
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
