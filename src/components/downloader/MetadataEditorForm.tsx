/**
 * MetadataEditorForm - Complete metadata editing form
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Rating,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon, Star as StarIcon, PlayCircle as PlayIcon } from '@mui/icons-material';
import type { IDownloadItem, IStashPerformer, IStashTag, IStashStudio } from '@/types';
import { ContentType } from '@/types';
import { PerformerSelector } from '@/components/common/PerformerSelector';
import { TagSelector } from '@/components/common/TagSelector';
import { StudioSelector } from '@/components/common/StudioSelector';
import { MediaPreviewModal } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getScraperRegistry } from '@/services/metadata';

interface MetadataEditorFormProps {
  item: IDownloadItem;
  onSave: (editedMetadata: IDownloadItem['editedMetadata']) => void;
  onCancel: () => void;
}

export const MetadataEditorForm: React.FC<MetadataEditorFormProps> = ({
  item,
  onSave,
  onCancel,
}) => {
  const toast = useToast();
  const log = useLog();
  const [title, setTitle] = useState(item.metadata?.title || '');
  const [description, setDescription] = useState(item.metadata?.description || '');
  const [date, setDate] = useState(item.metadata?.date || '');
  const [rating, setRating] = useState(0);
  const [performers, setPerformers] = useState<IStashPerformer[]>([]);
  const [tags, setTags] = useState<IStashTag[]>([]);
  const [studio, setStudio] = useState<IStashStudio | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = useState('');

  const handlePreview = (url: string, type: 'image' | 'video') => {
    setPreviewUrl(url);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  // Initialize with scraped metadata
  useEffect(() => {
    if (item.metadata) {
      setTitle(item.metadata.title || '');
      setDescription(item.metadata.description || '');
      setDate(item.metadata.date || '');
    }

    // Load existing edited metadata if available
    if (item.editedMetadata) {
      setTitle(item.editedMetadata.title || '');
      setDescription(item.editedMetadata.description || '');
      setDate(item.editedMetadata.date || '');
      setRating(item.editedMetadata.rating || 0);
    }
  }, [item]);

  const handleScrapeMetadata = async () => {
    setIsScraping(true);
    setScrapeError(null);

    try {
      log.addLog('info', 'scrape', `Scraping metadata from: ${item.url}`);

      const scraperRegistry = getScraperRegistry();
      const metadata = await scraperRegistry.scrape(item.url);

      log.addLog('success', 'scrape', `Successfully scraped metadata: ${metadata.title || item.url}`);

      // Update form fields with scraped data
      if (metadata.title) setTitle(metadata.title);
      if (metadata.description) setDescription(metadata.description);
      if (metadata.date) setDate(metadata.date);

      // TODO: Convert performer/tag/studio names to IStashPerformer/IStashTag/IStashStudio objects
      // For now, these would need to be matched against Stash database
      // or created as new entries

      toast.showToast('success', 'Metadata Scraped', `Successfully scraped: ${metadata.title || item.url}`);
      setScrapeError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scrape metadata';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      log.addLog('error', 'scrape', `Scraping failed: ${errorMessage}`, errorStack);
      toast.showToast('error', 'Scrape Failed', errorMessage);
      setScrapeError(errorMessage);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const editedMetadata = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      date: date || undefined,
      performerIds: performers.map((p) => p.id),
      tagIds: tags.map((t) => t.id),
      studioId: studio?.id || undefined,
      rating: rating > 0 ? rating : undefined,
    };

    onSave(editedMetadata);
  };

  return (
    <Card>
      <CardHeader title="Edit Metadata" />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Preview thumbnail if available */}
            {item.metadata?.thumbnailUrl && (
              <Box sx={{ textAlign: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <Box
                    component="img"
                    src={item.metadata.thumbnailUrl}
                    alt="Preview"
                    sx={{
                      maxHeight: 200,
                      maxWidth: '100%',
                      cursor: 'pointer',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: 4,
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
                          console.log('[MetadataEditor] Thumbnail failed, trying CORS proxy:', proxiedUrl);
                          img.src = proxiedUrl;
                        }
                      }
                    }}
                    title="Click to view full size"
                  />
                  {item.metadata?.videoUrl && item.metadata?.contentType === ContentType.Video && (
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<PlayIcon />}
                      onClick={() => item.metadata?.videoUrl && handlePreview(item.metadata.videoUrl, 'video')}
                      title="Preview video"
                    >
                      Preview Video
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {/* Source URL with Scrape button */}
            <Box>
              <TextField
                label="Source URL"
                value={item.url}
                disabled
                fullWidth
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="outlined"
                        startIcon={isScraping ? <CircularProgress size={16} /> : <SearchIcon />}
                        onClick={handleScrapeMetadata}
                        disabled={isScraping}
                      >
                        {isScraping ? 'Scraping...' : 'Scrape Metadata'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
              {scrapeError && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {scrapeError}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Click "Scrape Metadata" to fetch title, description, and other data from the website.
                {!localStorage.getItem('corsProxyEnabled') && (
                  <Typography component="span" color="warning.main">
                    {' '}Enable CORS proxy for better results!
                  </Typography>
                )}
              </Typography>
            </Box>

            {/* Title */}
            <TextField
              id="title"
              label="Title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              variant="outlined"
            />

            {/* Description */}
            <TextField
              id="description"
              label="Description"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              variant="outlined"
            />

            {/* Date */}
            <TextField
              id="date"
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
            />

            {/* Rating */}
            <Box>
              <Typography variant="body2" gutterBottom>
                Rating
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating
                  value={rating / 20}
                  max={5}
                  onChange={(_, newValue) => {
                    setRating(newValue ? newValue * 20 : 0);
                  }}
                  emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
                />
                {rating > 0 && (
                  <Button size="small" variant="outlined" onClick={() => setRating(0)}>
                    Clear
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Rating: {rating}/100
              </Typography>
            </Box>

            {/* Performers */}
            <PerformerSelector
              selectedPerformers={performers}
              onChange={setPerformers}
            />

            {/* Tags */}
            <TagSelector selectedTags={tags} onChange={setTags} />

            {/* Studio */}
            <StudioSelector selectedStudio={studio} onChange={setStudio} />

            {/* Actions */}
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained">
                Save & Import to Stash
              </Button>
              <Button variant="outlined" onClick={onCancel}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </CardContent>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mediaUrl={previewUrl}
        mediaType={previewType}
        alt={title || item.metadata?.title || 'Preview'}
      />
    </Card>
  );
};
