/**
 * MetadataEditorForm - Complete metadata editing form
 */

import React, { useState, useEffect } from 'react';
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
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">Edit Metadata</h6>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-column gap-3">
            {/* Preview thumbnail if available */}
            {item.metadata?.thumbnailUrl && (
              <div className="text-center">
                <div className="d-flex gap-2 align-items-center justify-content-center">
                  <img
                    src={item.metadata.thumbnailUrl}
                    alt="Preview"
                    style={{
                      maxHeight: '200px',
                      maxWidth: '100%',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6',
                      transition: 'transform 0.2s, box-shadow 0.2s',
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title="Click to view full size"
                  />
                  {item.metadata?.videoUrl && item.metadata?.contentType === ContentType.Video && (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => item.metadata?.videoUrl && handlePreview(item.metadata.videoUrl, 'video')}
                      title="Preview video"
                    >
                      ▶ Preview Video
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Source URL with Scrape button */}
            <div className="mb-3">
              <label className="form-label">Source URL</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={item.url}
                  disabled
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleScrapeMetadata}
                  disabled={isScraping}
                >
                  {isScraping ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Scraping...
                    </>
                  ) : (
                    <>🔍 Scrape Metadata</>
                  )}
                </button>
              </div>
              {scrapeError && (
                <div className="text-danger small mt-1">
                  {scrapeError}
                </div>
              )}
              <div className="text-muted small mt-1">
                Click "Scrape Metadata" to fetch title, description, and other data from the website.
                {!localStorage.getItem('corsProxyEnabled') && (
                  <span className="text-warning">
                    {' '}Enable CORS proxy for better results!
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label htmlFor="title" className="form-label">Title *</label>
              <input
                id="title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                className="form-control"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="mb-3">
              <label htmlFor="date" className="form-label">Date</label>
              <input
                id="date"
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Rating */}
            <div className="mb-3">
              <label className="form-label d-block">Rating</label>
              <div className="d-flex gap-2 align-items-center">
                <div className="d-flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      style={{
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        color: star <= rating / 20 ? '#ffc107' : '#dee2e6',
                      }}
                      onClick={() => setRating(star * 20)}
                      title={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {rating > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setRating(0)}
                  >
                    Clear
                  </button>
                )}
              </div>
              <small className="text-muted">Rating: {rating}/100</small>
            </div>

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
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary">
                💾 Save & Import to Stash
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mediaUrl={previewUrl}
        mediaType={previewType}
        alt={title || item.metadata?.title || 'Preview'}
      />
    </div>
  );
};
