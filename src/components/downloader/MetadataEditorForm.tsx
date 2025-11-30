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
import { useSettings } from '@/hooks';
import { getScraperRegistry, getMetadataMatchingService } from '@/services/metadata';
import { createLogger } from '@/utils';

const debugLog = createLogger('MetadataEditor');

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
  const { settings } = useSettings();
  const [title, setTitle] = useState(item.metadata?.title || '');
  const [description, setDescription] = useState(item.metadata?.description || '');
  const [date, setDate] = useState(item.metadata?.date || '');
  const [rating, setRating] = useState(0);
  const [performers, setPerformers] = useState<IStashPerformer[]>([]);
  const [tags, setTags] = useState<IStashTag[]>([]);
  const [studio, setStudio] = useState<IStashStudio | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = useState('');

  const handlePreview = (url: string, type: 'image' | 'video') => {
    setPreviewUrl(url);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  // Track if auto-match has been triggered
  const [hasAutoMatched, setHasAutoMatched] = useState(false);

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
      // Load full objects if they exist
      if (item.editedMetadata.performers) {
        setPerformers(item.editedMetadata.performers);
      }
      if (item.editedMetadata.tags) {
        setTags(item.editedMetadata.tags);
      }
      if (item.editedMetadata.studio) {
        setStudio(item.editedMetadata.studio);
      }
    }
  }, [item]);

  // Auto-trigger "Match to Stash" when opening the form (if metadata has entities)
  useEffect(() => {
    // Skip if already matched, no metadata, or already have edited data
    if (hasAutoMatched || !item.metadata || item.editedMetadata) {
      return;
    }

    // Only auto-match if there are entities to match
    const hasEntities = (item.metadata.performers?.length ?? 0) > 0 ||
                       (item.metadata.tags?.length ?? 0) > 0 ||
                       !!item.metadata.studio;

    if (hasEntities) {
      setHasAutoMatched(true);
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        handleMatchToStash();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [item.metadata, item.editedMetadata, hasAutoMatched]);

  /**
   * Clear all matched metadata (performers, tags, studio)
   */
  const handleClearAllMatched = () => {
    setPerformers([]);
    setTags([]);
    setStudio(null);
    toast.showToast('info', 'Cleared', 'All matched entities have been cleared');
  };

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

      // After scraping, use "Match to Stash" button to convert names to Stash entities

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

  /**
   * Match scraped metadata names against Stash database
   */
  const handleMatchToStash = async () => {
    if (!item.metadata) {
      toast.showToast('warning', 'No Metadata', 'Please scrape metadata first before matching.');
      return;
    }

    setIsMatching(true);
    setMatchError(null);

    try {
      log.addLog('info', 'match', `Matching metadata to Stash for: ${item.url}`);

      const matchingService = getMetadataMatchingService();
      const result = await matchingService.matchMetadataToStash(item.metadata);

      // Combine matched and unmatched into the selectors
      const allPerformers: IStashPerformer[] = [
        ...result.matchedPerformers,
        ...matchingService.createTempPerformers(result.unmatchedPerformers),
      ];
      const allTags: IStashTag[] = [
        ...result.matchedTags,
        ...matchingService.createTempTags(result.unmatchedTags),
      ];

      setPerformers(allPerformers);
      setTags(allTags);

      if (result.matchedStudio) {
        setStudio(result.matchedStudio);
      } else if (result.unmatchedStudio) {
        setStudio(matchingService.createTempStudio(result.unmatchedStudio));
      }

      const matchSummary = [
        `${result.matchedPerformers.length} performers matched`,
        `${result.unmatchedPerformers.length} new performers`,
        `${result.matchedTags.length} tags matched`,
        `${result.unmatchedTags.length} new tags`,
        result.matchedStudio ? '1 studio matched' : (result.unmatchedStudio ? '1 new studio' : ''),
      ].filter(Boolean).join(', ');

      log.addLog('success', 'match', `Matching complete: ${matchSummary}`);
      toast.showToast('success', 'Matching Complete', matchSummary);
      setMatchError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to match metadata';
      const errorStack = error instanceof Error ? error.stack : undefined;

      log.addLog('error', 'match', `Matching failed: ${errorMessage}`, errorStack);
      toast.showToast('error', 'Match Failed', errorMessage);
      setMatchError(errorMessage);
    } finally {
      setIsMatching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Pass full objects so StashImportService can create new entities with temp IDs
    const editedMetadata = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      date: date || undefined,
      performers: performers.length > 0 ? performers : undefined,
      tags: tags.length > 0 ? tags : undefined,
      studio: studio || undefined,
      rating: rating > 0 ? rating : undefined,
    };

    onSave(editedMetadata);
  };

  return (
    <div className="card text-light" style={{ backgroundColor: '#30404d', borderColor: '#394b59' }}>
      <div className="card-header" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
        <h6 className="mb-0">Edit Metadata</h6>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-column gap-3">
            {/* Preview thumbnail if available and enabled */}
            {item.metadata?.thumbnailUrl && settings.showThumbnailPreviews ? (
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
                      border: '1px solid #394b59',
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
                          debugLog.debug(`Thumbnail failed, trying CORS proxy: ${proxiedUrl}`);
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
            ) : item.metadata?.thumbnailUrl && !settings.showThumbnailPreviews ? (
              // Show placeholder when thumbnails are disabled
              <div className="text-center">
                <div
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#243340',
                    borderRadius: '4px',
                    border: '1px solid #394b59',
                  }}
                >
                  <span style={{ fontSize: '32px', opacity: 0.6 }}>
                    {item.metadata?.contentType === ContentType.Image ? '🖼️' : '🎬'}
                  </span>
                </div>
                {item.metadata?.videoUrl && item.metadata?.contentType === ContentType.Video && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => item.metadata?.videoUrl && handlePreview(item.metadata.videoUrl, 'video')}
                      title="Preview video"
                    >
                      ▶ Preview Video
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Source URL with Scrape button */}
            <div className="mb-3">
              <label className="form-label" style={{ color: '#8b9fad' }}>Source URL</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control text-light"
                  style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                  value={item.url}
                  disabled
                />
                <button
                  type="button"
                  className="btn btn-outline-light"
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
              <small className="mt-1 d-block" style={{ color: '#8b9fad' }}>
                Click "Scrape Metadata" to fetch title, description, and other data from the website.
              </small>
            </div>

            {/* Match to Stash Button */}
            {item.metadata && (item.metadata.performers?.length || item.metadata.tags?.length || item.metadata.studio) && (
              <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#243340', border: '1px solid #394b59' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <strong>Scraped Entities</strong>
                    <div className="text-muted small">
                      {[
                        item.metadata.performers?.length ? `${item.metadata.performers.length} performers` : null,
                        item.metadata.tags?.length ? `${item.metadata.tags.length} tags` : null,
                        item.metadata.studio ? `1 studio` : null,
                      ].filter(Boolean).join(', ') || 'None found'}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-info"
                      onClick={handleMatchToStash}
                      disabled={isMatching || isScraping}
                    >
                      {isMatching ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Matching...
                        </>
                      ) : (
                        <>🔗 Re-match</>
                      )}
                    </button>
                    {(performers.length > 0 || tags.length > 0 || studio) && (
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={handleClearAllMatched}
                        title="Clear all matched performers, tags, and studio"
                      >
                        🗑️ Clear All
                      </button>
                    )}
                  </div>
                </div>
                {matchError && (
                  <div className="text-danger small">
                    {matchError}
                  </div>
                )}
                <div className="text-muted small">
                  Entities are auto-matched when you open this form.
                  Use "Re-match" to refresh or "Clear All" to remove all matched entities.
                </div>
              </div>
            )}

            {/* Title */}
            <div className="mb-3">
              <label htmlFor="title" className="form-label" style={{ color: '#8b9fad' }}>Title *</label>
              <input
                id="title"
                type="text"
                className="form-control text-light"
                style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label htmlFor="description" className="form-label" style={{ color: '#8b9fad' }}>Description</label>
              <textarea
                id="description"
                className="form-control text-light"
                style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="mb-3">
              <label htmlFor="date" className="form-label" style={{ color: '#8b9fad' }}>Date</label>
              <input
                id="date"
                type="date"
                className="form-control text-light"
                style={{ backgroundColor: '#243340', borderColor: '#394b59', colorScheme: 'dark' }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Rating */}
            <div className="mb-3">
              <label className="form-label d-block" style={{ color: '#8b9fad' }}>Rating</label>
              <div className="d-flex gap-2 align-items-center">
                <div className="d-flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      style={{
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        color: star <= rating / 20 ? '#ffc107' : '#394b59',
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
                    className="btn btn-sm btn-outline-light"
                    onClick={() => setRating(0)}
                  >
                    Clear
                  </button>
                )}
              </div>
              <small style={{ color: '#8b9fad' }}>Rating: {rating}/100</small>
            </div>

            {/* Performers */}
            <div className="position-relative">
              {performers.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger position-absolute"
                  style={{ top: 0, right: 0, zIndex: 1 }}
                  onClick={() => setPerformers([])}
                  title="Clear all performers"
                >
                  Clear
                </button>
              )}
              <PerformerSelector
                selectedPerformers={performers}
                onChange={setPerformers}
              />
            </div>

            {/* Tags */}
            <div className="position-relative">
              {tags.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger position-absolute"
                  style={{ top: 0, right: 0, zIndex: 1 }}
                  onClick={() => setTags([])}
                  title="Clear all tags"
                >
                  Clear
                </button>
              )}
              <TagSelector selectedTags={tags} onChange={setTags} />
            </div>

            {/* Studio */}
            <div className="position-relative">
              {studio && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger position-absolute"
                  style={{ top: 0, right: 0, zIndex: 1 }}
                  onClick={() => setStudio(null)}
                  title="Clear studio"
                >
                  Clear
                </button>
              )}
              <StudioSelector selectedStudio={studio} onChange={setStudio} />
            </div>

            {/* Actions */}
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-success">
                💾 Save & Import to Stash
              </button>
              <button type="button" className="btn btn-outline-light" onClick={onCancel}>
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
