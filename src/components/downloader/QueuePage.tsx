/**
 * QueuePage - Main download queue page
 */

import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Card, CardContent, Button, Stack, AppBar, Toolbar, Link, Alert, Chip } from '@mui/material';
import { ThemeToggle } from '@/components/common/ThemeToggle';
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
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexGrow: 1,
            }}
          >
            <Box
              component="img"
              src={logoSvg}
              alt="Stash Downloader Logo"
              sx={{
                width: 40,
                height: 40,
              }}
            />
            <Typography variant="h6" component="div">
              Stash Downloader
            </Typography>
          </Box>
          {isTestMode && (
            <Chip
              label="DEVELOPMENT MODE"
              color="warning"
              size="small"
              sx={{ mr: 1 }}
            />
          )}
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Test settings panel in test mode */}
          {isTestMode && testSettingsPanel}

          <URLInputForm 
            onSubmit={handleAddUrl} 
            initialValue={urlFieldValue}
            onValueChange={setUrlFieldValue}
          />

          {/* Batch Import */}
          <Box sx={{ mb: 3 }}>
            <BatchImport 
              onImport={handleBatchImport}
              onSingleUrl={(url) => {
                setUrlFieldValue(url);
              }}
            />
          </Box>

          {/* Queue Statistics */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-around" alignItems="center">
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" component="div">
                    {queue.stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" component="div" color="primary">
                    {queue.stats.downloading}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Downloading
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" component="div" color="success.main">
                    {queue.stats.complete}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Complete
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" component="div" color="error.main">
                    {queue.stats.failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {queue.items.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button
                variant="contained"
                onClick={() => {
                  const firstPending = queue.items.find(item => item.status === DownloadStatus.Pending);
                  if (firstPending) setEditingItem(firstPending);
                }}
                disabled={queue.stats.pending === 0}
              >
                Edit & Import ({queue.stats.pending} items)
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={queue.clearCompleted}
                disabled={queue.stats.complete === 0}
              >
                Clear Completed
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={queue.clearAll}
              >
                Clear All
              </Button>
            </Stack>
          )}

          {/* Queue Items */}
          {queue.items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No downloads in queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter a URL above to get started
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
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
            </Stack>
          )}

          {/* Activity Log */}
          <LogViewer />
        </Stack>
      </Container>

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
        <Stack spacing={2}>
          <Alert severity="info">
            <strong>yt-dlp</strong> is a powerful video extraction tool that provides the highest quality downloads from hundreds of sites.
          </Alert>

          <Typography variant="body1">
            <strong>What's happening:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            • yt-dlp is not detected on your system<br />
            • The app will fall back to built-in scrapers (YouPornScraper, PornhubScraper)<br />
            • Built-in scrapers may only extract <strong>lower quality videos</strong> (360p-480p)<br />
            • Some sites may not work at all without yt-dlp
          </Typography>

          <Typography variant="body1" sx={{ mt: 2 }}>
            <strong>To install yt-dlp:</strong>
          </Typography>
          <Box component="pre" sx={{ bgcolor: 'grey.900', color: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
            <code>
              # Using pip (recommended){'\n'}
              pip install yt-dlp{'\n\n'}
              # Or using pipx (isolated install){'\n'}
              pipx install yt-dlp{'\n\n'}
              # Verify installation{'\n'}
              yt-dlp --version
            </code>
          </Box>

          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> You may need to restart the dev server after installing yt-dlp for changes to take effect.
          </Typography>

          <Alert severity="success">
            <Typography variant="body2">
              <strong>Alternative:</strong> Download the standalone executable from{' '}
              <Link href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer">
                github.com/yt-dlp/yt-dlp/releases
              </Link>
              {' '}and add it to your system PATH.
            </Typography>
          </Alert>
        </Stack>
      </InfoModal>

      {/* Item Log Modal */}
      <ItemLogModal
        open={!!viewingLogsForItem}
        onClose={() => setViewingLogsForItem(null)}
        title={viewingLogsForItem?.metadata?.title || viewingLogsForItem?.url || ''}
        logs={viewingLogsForItem?.logs || []}
      />
    </Box>
  );
};
