/**
 * QueuePage - Main download queue page
 */

import React, { useState, useEffect } from 'react';
import { InfoModal } from '@/components/common/InfoModal';
import { ItemLogModal } from '@/components/common/ItemLogModal';
import { RescrapeModal } from '@/components/common/RescrapeModal';
import { URLInputForm, type ContentTypeOption } from './URLInputForm';
import { QueueItem } from './QueueItem';
import { BatchImport } from './BatchImport';
import { EditMetadataModal } from './EditMetadataModal';
import { LogViewer } from '@/components/common';
import { useDownloadQueue } from '@/hooks';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getScraperRegistry } from '@/services/metadata';
import { getStashService } from '@/services/stash/StashGraphQLService';
import { DownloadStatus } from '@/types';
import type { IDownloadItem, IScrapedMetadata } from '@/types';
import { createLogger } from '@/utils';
import { useSettings } from '@/hooks';
import { STORAGE_KEYS, DEFAULT_SETTINGS, PLUGIN_ID } from '@/constants';
import type { IPluginSettings } from '@/types';
import logoSvg from '@/assets/logo.svg';

const debugLog = createLogger('QueuePage');

export const QueuePage: React.FC = () => {
  const queue = useDownloadQueue();
  const toast = useToast();
  const log = useLog();
  const scraperRegistry = getScraperRegistry();
  const { settings, updateSettings } = useSettings();
  const stashService = getStashService();
  const isStashEnvironment = stashService.isStashEnvironment();
  const [editingItem, setEditingItem] = useState<IDownloadItem | null>(null);
  const [viewingLogsForItem, setViewingLogsForItem] = useState<IDownloadItem | null>(null);
  const [urlFieldValue, setUrlFieldValue] = useState('');
  const [showYtDlpWarning, setShowYtDlpWarning] = useState(false);
  const [serverConfigExpanded, setServerConfigExpanded] = useState(false);

  // Re-scrape modal state
  const [rescrapeItem, setRescrapeItem] = useState<IDownloadItem | null>(null);
  const [rescrapeScraperName, setRescrapeScraperName] = useState('');
  const [rescrapeNewMetadata, setRescrapeNewMetadata] = useState<IScrapedMetadata | undefined>(undefined);
  const [rescrapeLoading, setRescrapeLoading] = useState(false);
  const [rescrapeError, setRescrapeError] = useState<string | undefined>(undefined);

  // Get proxy info for display
  const httpProxy = settings.httpProxy;
  const serverDownloadPath = settings.serverDownloadPath || DEFAULT_SETTINGS.serverDownloadPath;
  
  // Fetch and sync settings from Stash on mount (once, no polling)
  useEffect(() => {
    if (!isStashEnvironment) return;

    let mounted = true;

    const syncSettingsFromStash = async () => {
      try {
        const graphqlSettings = await stashService.getPluginSettings(PLUGIN_ID);
        if (!mounted) return;

        if (graphqlSettings && Object.keys(graphqlSettings).length > 0) {
          debugLog.debug('Loaded from Stash:', JSON.stringify(graphqlSettings));

          // Merge Stash settings into local settings (Stash settings take priority)
          updateSettings(graphqlSettings as Partial<IPluginSettings>);

          // Log proxy status
          if (graphqlSettings.httpProxy) {
            const masked = String(graphqlSettings.httpProxy).replace(/:[^:@]*@/, ':****@');
            debugLog.info(`✓ HTTP/SOCKS proxy: ${masked}`);
          }

          // Log download path - plugin setting takes priority over Stash library
          try {
            if (graphqlSettings.serverDownloadPath) {
              // User explicitly set a download path - use it
              debugLog.info(`✓ Download path (plugin setting): ${graphqlSettings.serverDownloadPath}`);
            } else {
              // No plugin setting - fall back to Stash library
              const libraryPath = await stashService.getVideoLibraryPath();
              if (libraryPath) {
                debugLog.info(`✓ Download path (Stash library): ${libraryPath}`);
              } else {
                debugLog.info(`✓ Download path (default): ${DEFAULT_SETTINGS.serverDownloadPath}`);
              }
            }
          } catch (pathError) {
            debugLog.warn('Could not determine download path:', String(pathError));
          }
        } else {
          debugLog.debug('No settings configured in Stash');
        }
      } catch (error) {
        debugLog.warn('Could not fetch settings from Stash:', String(error));
      }
    };

    syncSettingsFromStash();

    // Listen for cross-tab storage changes (no polling needed)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.SETTINGS && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue) as IPluginSettings;
          if (newSettings.httpProxy) {
            const masked = newSettings.httpProxy.replace(/:[^:@]*@/, ':****@');
            debugLog.debug(`Updated: proxy=${masked}`);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStashEnvironment]);


  const handleAddUrl = async (url: string, contentTypeOption: ContentTypeOption = 'auto') => {
    // Clear URL field after adding
    setUrlFieldValue('');

    // Convert content type option to actual ContentType (undefined for auto)
    const preferredContentType = contentTypeOption === 'auto' ? undefined : contentTypeOption;

    // Check for duplicate in queue
    if (queue.isUrlInQueue(url)) {
      const existing = queue.findByUrl(url);
      log.addLog('warning', 'scrape', `Duplicate URL: ${url} (already in queue as "${existing?.metadata?.title || 'Pending'}")`);
      toast.showToast('warning', 'Duplicate URL', 'This URL is already in the queue.');
      return;
    }

    // Check for existing scene in Stash database
    let existingSceneInfo: { id: string; title?: string } | undefined;
    if (isStashEnvironment) {
      try {
        const existingScene = await stashService.findSceneByURL(url);
        if (existingScene) {
          existingSceneInfo = { id: existingScene.id, title: existingScene.title };
          log.addLog('warning', 'scrape', `Scene already exists in Stash: "${existingScene.title || existingScene.id}"`);
          toast.showToast('warning', 'Scene Exists', `This scene already exists in Stash: "${existingScene.title || 'ID: ' + existingScene.id}". Adding anyway.`);
          // Continue adding - user can choose to skip manually
        }
      } catch (error) {
        // Log but don't block if duplicate check fails
        debugLog.warn('Failed to check for existing scene:', String(error));
      }
    }

    // Add to queue
    const itemId = queue.addToQueue(url);
    if (!itemId) {
      // This shouldn't happen if our duplicate check worked, but handle it
      toast.showToast('error', 'Add Failed', 'Failed to add URL to queue.');
      return;
    }

    // If scene exists in Stash, mark the item
    if (existingSceneInfo) {
      queue.updateItem(itemId, { existsInStash: existingSceneInfo });
    }

    log.addLog('info', 'scrape', `Added URL to queue: ${url}`);
    
    // Scrape metadata in background and update the item
    (async () => {
      try {
        debugLog.debug(`======== Starting metadata scrape ========`);
        debugLog.debug(`URL: ${url}`);
        debugLog.debug(`Item ID: ${itemId}`);
        debugLog.debug(`Current queue items: ${queue.items.length}`);
        log.addLog('info', 'scrape', `Starting metadata scrape for: ${url}`);
        
        // Note: We don't need to find the item - React state updates are async
        // We can update it directly using the itemId
        
        // Scrape metadata from URL (use enhancement flow for better fallback)
        debugLog.debug(`Calling scraperRegistry.scrapeWithEnhancement() (preferredContentType: ${preferredContentType || 'auto'})...`);
        const metadata = await scraperRegistry.scrapeWithEnhancement(url, preferredContentType);
        debugLog.debug(`Scraping completed:`, JSON.stringify({
          title: metadata.title,
          hasVideoUrl: !!metadata.videoUrl,
          hasImageUrl: !!metadata.imageUrl,
          contentType: metadata.contentType,
        }));

        // Update the queue item with scraped metadata
        debugLog.debug(`Updating item ${itemId} with metadata...`);
        queue.updateItem(itemId, {
          metadata,
        });
        debugLog.debug(`Item updated successfully`);
        
        // Build detailed log message with all available metadata
        const logDetails: string[] = [
          `Title: ${metadata.title || 'N/A'}`,
          `Content Type: ${metadata.contentType}`,
          `Description: ${metadata.description ? metadata.description.substring(0, 100) + '...' : 'N/A'}`,
          `Thumbnail: ${metadata.thumbnailUrl ? 'Available ✓' : 'N/A'}`,
        ];

        // Video/Image URL info
        if (metadata.videoUrl) {
          logDetails.push(`Video URL: Extracted ✓`);
        }
        if (metadata.imageUrl) {
          logDetails.push(`Image URL: Extracted ✓`);
        }

        // Duration for videos
        if (metadata.duration) {
          logDetails.push(`Duration: ${metadata.duration}s`);
        }

        // Performers/Tags/Studio
        logDetails.push(`Performers: ${metadata.performers?.length || 0}`);
        logDetails.push(`Tags: ${metadata.tags?.length || 0}`);
        if (metadata.studio) {
          logDetails.push(`Studio: ${metadata.studio}`);
        }

        // Booru-specific metadata
        if (metadata.artist) {
          logDetails.push(`Artist: ${metadata.artist}`);
        }
        if (metadata.sourceId) {
          logDetails.push(`Source ID: ${metadata.sourceId}`);
        }
        if (metadata.sourceRating) {
          logDetails.push(`Rating: ${metadata.sourceRating}`);
        }
        if (metadata.sourceScore !== undefined) {
          logDetails.push(`Score: ${metadata.sourceScore}`);
        }

        // Gallery info
        if (metadata.galleryImages?.length) {
          logDetails.push(`Gallery Images: ${metadata.galleryImages.length}`);
        }

        // Capabilities
        if (metadata.capabilities) {
          const caps = metadata.capabilities;
          const capsList: string[] = [];
          if (caps.hasPerformers) capsList.push('performers');
          if (caps.hasTags) capsList.push('tags');
          if (caps.hasStudio) capsList.push('studio');
          if (caps.hasRating) capsList.push('rating');
          if (capsList.length > 0) {
            logDetails.push(`Capabilities: ${capsList.join(', ')}`);
          }
        }

        log.addLog('success', 'scrape', `Successfully scraped metadata: ${metadata.title || url}`,
          logDetails.join('\n')
        );
        
        if (metadata.videoUrl) {
          debugLog.debug('✓ Scraper extracted videoUrl:', metadata.videoUrl.substring(0, 100) + '...');
        } else if (metadata.imageUrl) {
          debugLog.debug('✓ Scraper extracted imageUrl:', metadata.imageUrl.substring(0, 100) + '...');
        } else {
          // This is normal for Stash's built-in scraper - it doesn't return direct video URLs
          // The download service will use yt-dlp or the page URL as fallback
          debugLog.debug('ℹ️ No direct video/image URL extracted - download service will use yt-dlp or page URL');
        }
        toast.showToast('success', 'Metadata Scraped', `Successfully scraped metadata for ${metadata.title || url}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorDetails = error instanceof Error ? 
          `Error: ${errorMessage}\n\nStack trace:\n${errorStack || 'No stack trace available'}` :
          `Error: ${String(error)}`;
        
        debugLog.error('Scraping failed with full details:', JSON.stringify({
          url,
          errorMessage,
          errorStack: errorStack || 'No stack trace',
        }));
        
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

    // Auto-advance to next pending item
    const pendingItems = queue.items.filter(
      (i) => i.status === DownloadStatus.Pending && i.id !== itemId
    );
    const nextItem = pendingItems[0];
    if (nextItem) {
      // Small delay to let state update before opening next item
      setTimeout(() => {
        setEditingItem(nextItem);
      }, 100);
    } else {
      setEditingItem(null);
    }
  };

  // Skip to next pending item
  const handleSkipToNext = () => {
    if (!editingItem) return;

    const pendingItems = queue.items.filter(
      (i) => i.status === DownloadStatus.Pending
    );
    const currentIndex = pendingItems.findIndex((i) => i.id === editingItem.id);

    if (currentIndex >= 0 && currentIndex < pendingItems.length - 1) {
      // Move to next item
      const nextItem = pendingItems[currentIndex + 1];
      if (nextItem) setEditingItem(nextItem);
    } else if (currentIndex === pendingItems.length - 1) {
      // Wrap to first item if at end
      const firstItem = pendingItems[0];
      if (firstItem) setEditingItem(firstItem);
    }
  };

  // Calculate queue position for modal
  const getQueuePosition = (): { position: number; total: number } | null => {
    if (!editingItem) return null;

    const pendingItems = queue.items.filter(
      (i) => i.status === DownloadStatus.Pending
    );
    const currentIndex = pendingItems.findIndex((i) => i.id === editingItem.id);

    if (currentIndex >= 0) {
      return { position: currentIndex + 1, total: pendingItems.length };
    }
    return null;
  };

  const queuePosition = getQueuePosition();

  // Handle re-scrape click - opens the modal and starts scraping
  const handleRescrapeClick = async (itemId: string, scraperName: string) => {
    const item = queue.items.find((i) => i.id === itemId);
    if (!item) return;

    // Reset modal state and open it
    setRescrapeItem(item);
    setRescrapeScraperName(scraperName);
    setRescrapeNewMetadata(undefined);
    setRescrapeError(undefined);
    setRescrapeLoading(true);

    log.addLog('info', 'scrape', `Re-scraping with ${scraperName}: ${item.url}`);

    try {
      const metadata = await scraperRegistry.scrapeWithScraper(item.url, scraperName);
      setRescrapeNewMetadata(metadata);
      setRescrapeLoading(false);
      log.addLog('success', 'scrape', `Re-scrape with ${scraperName} completed: ${metadata.title || item.url}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setRescrapeError(errorMsg);
      setRescrapeLoading(false);
      log.addLog('error', 'scrape', `Re-scrape failed with ${scraperName}: ${errorMsg}`);
    }
  };

  // Handle applying merged metadata from re-scrape modal
  const handleRescrapeApply = (mergedMetadata: IScrapedMetadata) => {
    if (!rescrapeItem) return;

    queue.updateItem(rescrapeItem.id, { metadata: mergedMetadata, error: undefined });
    toast.showToast('success', 'Metadata Updated', `Applied merged metadata from ${rescrapeScraperName}`);
    log.addLog('success', 'scrape', `Applied merged metadata for: ${mergedMetadata.title || rescrapeItem.url}`);

    // Close modal
    setRescrapeItem(null);
  };

  // Handle closing the re-scrape modal
  const handleRescrapeClose = () => {
    setRescrapeItem(null);
    setRescrapeNewMetadata(undefined);
    setRescrapeError(undefined);
    setRescrapeLoading(false);
  };

  // Handle retry for failed items
  const handleRetry = async (itemId: string) => {
    const item = queue.items.find((i) => i.id === itemId);
    if (!item) return;

    log.addLog('info', 'retry', `Retrying failed item: ${item.url}`);
    toast.showToast('info', 'Retry', 'Retrying download...');

    // Reset item status to Pending and clear error
    queue.updateItem(itemId, {
      status: DownloadStatus.Pending,
      error: undefined,
      progress: undefined,
    });

    // If we already have metadata, we don't need to re-scrape - just need to trigger download again
    // The download will be triggered when user clicks Edit & Import
    if (item.metadata) {
      log.addLog('success', 'retry', `Item reset to pending: ${item.metadata.title || item.url}`);
      toast.showToast('success', 'Ready to Retry', 'Item reset to pending. Click "Edit" to retry the download.');
      return;
    }

    // No metadata - need to re-scrape
    debugLog.debug(`Retrying scrape for: ${item.url}`);

    try {
      // No preferred content type since we don't have metadata
      const metadata = await scraperRegistry.scrapeWithEnhancement(item.url, undefined);

      queue.updateItem(itemId, {
        metadata,
        error: undefined,
      });

      log.addLog('success', 'retry', `Retry successful: ${metadata.title || item.url}`);
      toast.showToast('success', 'Retry Successful', `Scraped metadata: ${metadata.title || 'Unknown'}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      queue.updateItem(itemId, {
        error: `Retry failed: ${errorMessage}`,
        status: DownloadStatus.Failed,
      });

      log.addLog('error', 'retry', `Retry failed: ${errorMessage}`);
      toast.showToast('error', 'Retry Failed', errorMessage);
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <div className="container-lg py-4">
        <div className="d-flex flex-column gap-3">
          {/* Logo */}
          <div className="d-flex align-items-center gap-3 mb-2" style={{ border: '1px dashed rgba(255,255,255,0.3)', padding: '8px', borderRadius: '4px', width: 'fit-content' }}>
            <img
              src={logoSvg}
              alt="Stash Downloader Logo"
              style={{ width: '40px', height: '40px' }}
            />
          </div>

          {/* Proxy and Server Status */}
          {isStashEnvironment && (
            <div className="card text-light mb-3" style={{ backgroundColor: '#30404d', borderColor: '#394b59' }}>
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{ backgroundColor: '#243340', borderColor: '#394b59', cursor: 'pointer' }}
                onClick={() => setServerConfigExpanded(!serverConfigExpanded)}
              >
                <h6 className="mb-0">Server Configuration</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-light p-0"
                  style={{ textDecoration: 'none' }}
                >
                  {serverConfigExpanded ? '▲' : '▼'}
                </button>
              </div>
              {serverConfigExpanded && (
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
                      <>
                        <div className="d-flex gap-2 mt-2">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const { testHttpProxy } = await import('@/utils/systemCheck');
                              const result = await testHttpProxy(httpProxy);
                              if (result.success) {
                                toast.showToast('success', 'Proxy Test', result.message);
                                log.addLog('success', 'proxy', result.message, result.details);
                              } else {
                                toast.showToast('error', 'Proxy Test Failed', result.message);
                                log.addLog('error', 'proxy', result.message, result.details);
                              }
                            }}
                          >
                            Test Proxy
                          </button>
                        </div>
                        <small style={{ color: '#8b9fad' }}>
                          Proxy will be used for server-side downloads and metadata extraction. SSL certificate verification is disabled when using proxy.
                        </small>
                      </>
                    )}
                  </div>
                </div>
              )}
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

          {/* Queue Toolbar - Preview toggle and Log level */}
          <div className="d-flex justify-content-between align-items-center mb-2 px-2">
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm ${settings.showThumbnailPreviews ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => updateSettings({ showThumbnailPreviews: !settings.showThumbnailPreviews })}
                style={{ minWidth: '140px' }}
              >
                {settings.showThumbnailPreviews ? '🖼️ Thumbnails On' : '🖼️ Thumbnails Off'}
              </button>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 text-light" htmlFor="logLevelSelect" style={{ fontSize: '0.85em' }}>
                Log Level:
              </label>
              <select
                id="logLevelSelect"
                className="form-select form-select-sm"
                style={{ backgroundColor: '#243340', borderColor: '#394b59', color: '#fff', width: 'auto' }}
                value={settings.logLevel}
                onChange={(e) => updateSettings({ logLevel: e.target.value as IPluginSettings['logLevel'] })}
              >
                <option value="off">Off</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
          </div>

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
                  onViewLogs={(id) => {
                    // Find item and open logs modal
                    const itemToView = queue.items.find((i) => i.id === id);
                    if (itemToView) {
                      setViewingLogsForItem(itemToView);
                    }
                  }}
                  onRescrapeClick={handleRescrapeClick}
                  onRetry={handleRetry}
                  availableScrapers={scraperRegistry.getAvailableScrapersForUrl(item.url, item.metadata?.contentType)}
                  showThumbnail={settings.showThumbnailPreviews}
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
        queuePosition={queuePosition?.position}
        totalPending={queuePosition?.total}
        onSkip={handleSkipToNext}
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

      {/* Re-scrape Comparison Modal */}
      <RescrapeModal
        open={!!rescrapeItem}
        onClose={handleRescrapeClose}
        originalMetadata={rescrapeItem?.metadata}
        newMetadata={rescrapeNewMetadata}
        scraperName={rescrapeScraperName}
        onApply={handleRescrapeApply}
        isLoading={rescrapeLoading}
        error={rescrapeError}
      />
    </div>
  );
};
