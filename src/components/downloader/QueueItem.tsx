/**
 * QueueItem - Individual download item in the queue
 */

import React from 'react';
import { Card, CardContent, Box, Typography, Chip, LinearProgress, Stack, Button, IconButton, CircularProgress, Badge, Skeleton } from '@mui/material';
import { Download as DownloadIcon, Edit as EditIcon, Delete as DeleteIcon, VideoLibrary as VideoIcon, Image as ImageIcon, Article as LogsIcon, PlayCircle as PlayIcon } from '@mui/icons-material';
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
}

export const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove, onEdit, onDownload, onViewLogs }) => {
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
      [DownloadStatus.Pending]: { label: 'Pending', color: 'default' as const },
      [DownloadStatus.Downloading]: { label: 'Downloading', color: 'primary' as const },
      [DownloadStatus.Processing]: { label: 'Processing', color: 'info' as const },
      [DownloadStatus.Complete]: { label: 'Complete', color: 'success' as const },
      [DownloadStatus.Failed]: { label: 'Failed', color: 'error' as const },
      [DownloadStatus.Cancelled]: { label: 'Cancelled', color: 'warning' as const },
    };

    const config = statusConfig[item.status];
    return <Chip label={config.label} color={config.color} size="small" />;
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
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant={totalBytes > 0 ? "determinate" : "indeterminate"}
            value={percentage}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {totalBytes > 0
              ? `${formatBytes(bytesDownloaded)} / ${formatBytes(totalBytes)} (${formatBytes(speed)}/s)`
              : `Downloaded: ${formatBytes(bytesDownloaded)} (${formatBytes(speed)}/s)`
            }
          </Typography>
        </Box>
      );
    }

    // No progress data but status is downloading/processing - show indeterminate
    return (
      <Box sx={{ mt: 2 }}>
        <LinearProgress variant="indeterminate" sx={{ height: 8, borderRadius: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {item.status === DownloadStatus.Downloading ? 'Downloading...' : 'Processing...'}
        </Typography>
      </Box>
    );
  };

  const isScrapingMetadata = !item.metadata && !item.error && item.status === DownloadStatus.Pending;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Thumbnail preview or skeleton */}
          {isScrapingMetadata ? (
            <Skeleton
              variant="rectangular"
              width={120}
              height={80}
              sx={{ borderRadius: 1, flexShrink: 0 }}
              animation="wave"
            />
          ) : item.metadata?.thumbnailUrl ? (
            <Box
              component="img"
              src={item.metadata.thumbnailUrl}
              alt="Preview"
              sx={{
                maxHeight: 80,
                maxWidth: 120,
                objectFit: 'cover',
                cursor: 'pointer',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
                flexShrink: 0,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
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
                    // Hide broken images if no proxy
                    img.style.display = 'none';
                  }
                } else {
                  img.style.display = 'none';
                }
              }}
              title="Click to view full size"
            />
          ) : null}
          <Box sx={{ flexGrow: 1 }}>
            {/* Title section */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              {isScrapingMetadata ? (
                <Stack spacing={0.5} sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Scraping metadata...
                    </Typography>
                  </Stack>
                  <Skeleton width="60%" height={32} animation="wave" />
                </Stack>
              ) : item.metadata?.title ? (
                <Typography variant="h6" component="div">
                  {item.metadata.title}
                </Typography>
              ) : item.error ? (
                <Stack direction="row" spacing={1} alignItems="center" color="error.main">
                  <Typography variant="body2" color="error">
                    Scraping failed: {item.error}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            {/* URL */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {item.url}
            </Typography>

            {/* Status and metadata chips */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              {getStatusChip()}
              {isScrapingMetadata ? (
                <>
                  <Skeleton width={80} height={24} sx={{ borderRadius: '12px' }} animation="wave" />
                  <Skeleton width={60} height={24} sx={{ borderRadius: '12px' }} animation="wave" />
                </>
              ) : (
                item.metadata?.contentType && (
                  <Chip
                    icon={item.metadata.contentType === ContentType.Image ? <ImageIcon /> : <VideoIcon />}
                    label={item.metadata.contentType === ContentType.Image ? 'Image' : 'Video'}
                    size="small"
                    variant="outlined"
                    color={item.metadata.contentType === ContentType.Image ? 'secondary' : 'primary'}
                  />
                )
              )}
            </Stack>
            {item.error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {item.error}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {onDownload && item.status === DownloadStatus.Pending && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={() => onDownload(item.id)}
                title="Download directly without editing metadata"
              >
                Download
              </Button>
            )}
            {onEdit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => onEdit(item.id)}
                title={item.status === DownloadStatus.Complete ? "View metadata" : "Edit metadata & import"}
                disabled={item.status === DownloadStatus.Downloading || item.status === DownloadStatus.Processing}
              >
                {item.status === DownloadStatus.Complete ? 'View' : 'Edit'}
              </Button>
            )}
            {item.metadata?.videoUrl && item.metadata?.contentType === ContentType.Video && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => item.metadata?.videoUrl && handlePreview(item.metadata.videoUrl, 'video')}
                title="Preview video"
              >
                <PlayIcon />
              </IconButton>
            )}
            {onViewLogs && item.logs && item.logs.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onViewLogs(item.id)}
                title="View download logs"
                startIcon={
                  <Badge badgeContent={item.logs.length} color="primary" max={99}>
                    <LogsIcon />
                  </Badge>
                }
              >
                Logs
              </Button>
            )}
            <IconButton
              size="small"
              color="error"
              onClick={() => onRemove(item.id)}
              disabled={item.status === DownloadStatus.Downloading}
              title="Remove"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Stack>
        {getProgressBar()}
      </CardContent>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mediaUrl={previewUrl}
        mediaType={previewType}
        alt={item.metadata?.title || 'Preview'}
      />
    </Card>
  );
};
