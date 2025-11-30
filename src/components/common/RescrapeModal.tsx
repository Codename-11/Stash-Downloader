/**
 * RescrapeModal - Modal for comparing and merging re-scraped metadata
 */

import React, { useState, useEffect } from 'react';
import type { IScrapedMetadata } from '@/types';

interface RescrapeModalProps {
  open: boolean;
  onClose: () => void;
  originalMetadata: IScrapedMetadata | undefined;
  newMetadata: IScrapedMetadata | undefined;
  scraperName: string;
  onApply: (mergedMetadata: IScrapedMetadata) => void;
  isLoading?: boolean;
  error?: string;
}

type FieldSelection = 'original' | 'new';

interface FieldSelections {
  title: FieldSelection;
  description: FieldSelection;
  date: FieldSelection;
  videoUrl: FieldSelection;
  imageUrl: FieldSelection;
  thumbnailUrl: FieldSelection;
  performers: FieldSelection;
  tags: FieldSelection;
  studio: FieldSelection;
  duration: FieldSelection;
  quality: FieldSelection;
  galleryImages: FieldSelection;
}

const defaultSelections: FieldSelections = {
  title: 'new',
  description: 'new',
  date: 'new',
  videoUrl: 'original', // Preserve original URLs by default
  imageUrl: 'original',
  thumbnailUrl: 'new',
  performers: 'new',
  tags: 'new',
  studio: 'new',
  duration: 'new',
  quality: 'new',
  galleryImages: 'original',
};

export const RescrapeModal: React.FC<RescrapeModalProps> = ({
  open,
  onClose,
  originalMetadata,
  newMetadata,
  scraperName,
  onApply,
  isLoading = false,
  error,
}) => {
  const [selections, setSelections] = useState<FieldSelections>(defaultSelections);
  const [showAll, setShowAll] = useState(false);

  // Reset selections when modal opens
  useEffect(() => {
    if (open) {
      setSelections(defaultSelections);
      setShowAll(false);
    }
  }, [open]);

  // Helper to check if a field should be shown (has differences or showAll is true)
  const shouldShowField = (originalValue: string | undefined, newValue: string | undefined): boolean => {
    if (showAll) return true;
    const hasOriginal = originalValue !== undefined && originalValue !== '';
    const hasNew = newValue !== undefined && newValue !== '';
    // Show if values are different, or if at least one has content
    return (hasOriginal || hasNew) && originalValue !== newValue;
  };

  const shouldShowArrayField = (originalArray: string[] | undefined, newArray: string[] | undefined): boolean => {
    const originalStr = originalArray?.join(', ') || '';
    const newStr = newArray?.join(', ') || '';
    return shouldShowField(originalStr, newStr);
  };

  if (!open) return null;

  const handleSelectAll = (selection: FieldSelection) => {
    const newSelections: FieldSelections = {} as FieldSelections;
    Object.keys(selections).forEach((key) => {
      newSelections[key as keyof FieldSelections] = selection;
    });
    setSelections(newSelections);
  };

  const handleApply = () => {
    if (!newMetadata) return;

    // Merge metadata based on selections
    const merged: IScrapedMetadata = {
      url: originalMetadata?.url || newMetadata.url,
      contentType: newMetadata.contentType || originalMetadata?.contentType || newMetadata.contentType,
      title: selections.title === 'new' ? newMetadata.title : originalMetadata?.title,
      description: selections.description === 'new' ? newMetadata.description : originalMetadata?.description,
      date: selections.date === 'new' ? newMetadata.date : originalMetadata?.date,
      videoUrl: selections.videoUrl === 'new' ? newMetadata.videoUrl : originalMetadata?.videoUrl,
      imageUrl: selections.imageUrl === 'new' ? newMetadata.imageUrl : originalMetadata?.imageUrl,
      thumbnailUrl: selections.thumbnailUrl === 'new' ? newMetadata.thumbnailUrl : originalMetadata?.thumbnailUrl,
      performers: selections.performers === 'new' ? newMetadata.performers : originalMetadata?.performers,
      tags: selections.tags === 'new' ? newMetadata.tags : originalMetadata?.tags,
      studio: selections.studio === 'new' ? newMetadata.studio : originalMetadata?.studio,
      duration: selections.duration === 'new' ? newMetadata.duration : originalMetadata?.duration,
      quality: selections.quality === 'new' ? newMetadata.quality : originalMetadata?.quality,
      galleryImages: selections.galleryImages === 'new' ? newMetadata.galleryImages : originalMetadata?.galleryImages,
      // Always use new capabilities and source metadata
      capabilities: newMetadata.capabilities || originalMetadata?.capabilities,
      sourceId: newMetadata.sourceId || originalMetadata?.sourceId,
      sourceRating: newMetadata.sourceRating || originalMetadata?.sourceRating,
      sourceScore: newMetadata.sourceScore ?? originalMetadata?.sourceScore,
      artist: newMetadata.artist || originalMetadata?.artist,
    };

    onApply(merged);
  };

  const renderFieldComparison = (
    fieldKey: keyof FieldSelections,
    label: string,
    originalValue: string | undefined,
    newValue: string | undefined
  ) => {
    const hasOriginal = originalValue !== undefined && originalValue !== '';
    const hasNew = newValue !== undefined && newValue !== '';
    const isDifferent = originalValue !== newValue;

    return (
      <div
        className="mb-3 p-2 rounded"
        style={{ backgroundColor: isDifferent ? 'rgba(255, 193, 7, 0.1)' : 'transparent' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-1">
          <label className="form-label mb-0" style={{ color: '#8b9fad', fontSize: '0.85rem' }}>
            {label}
            {isDifferent && <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.65rem' }}>Different</span>}
          </label>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${selections[fieldKey] === 'original' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setSelections({ ...selections, [fieldKey]: 'original' })}
              disabled={!hasOriginal}
              style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
            >
              Keep
            </button>
            <button
              type="button"
              className={`btn ${selections[fieldKey] === 'new' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setSelections({ ...selections, [fieldKey]: 'new' })}
              disabled={!hasNew}
              style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
            >
              Use New
            </button>
          </div>
        </div>
        <div className="row g-2">
          <div className="col-6">
            <div
              className={`p-2 rounded ${selections[fieldKey] === 'original' ? 'border border-primary' : ''}`}
              style={{
                backgroundColor: '#1a252f',
                fontSize: '0.8rem',
                maxHeight: '60px',
                overflow: 'auto',
                opacity: hasOriginal ? 1 : 0.5,
              }}
            >
              <small className="text-muted d-block mb-1">Original:</small>
              <span className="text-light">{hasOriginal ? originalValue : '(empty)'}</span>
            </div>
          </div>
          <div className="col-6">
            <div
              className={`p-2 rounded ${selections[fieldKey] === 'new' ? 'border border-success' : ''}`}
              style={{
                backgroundColor: '#1a252f',
                fontSize: '0.8rem',
                maxHeight: '60px',
                overflow: 'auto',
                opacity: hasNew ? 1 : 0.5,
              }}
            >
              <small className="text-muted d-block mb-1">New ({scraperName}):</small>
              <span className="text-light">{hasNew ? newValue : '(empty)'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderArrayComparison = (
    fieldKey: keyof FieldSelections,
    label: string,
    originalArray: string[] | undefined,
    newArray: string[] | undefined
  ) => {
    const originalStr = originalArray?.join(', ') || '';
    const newStr = newArray?.join(', ') || '';
    return renderFieldComparison(fieldKey, label, originalStr, newStr);
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content bg-dark text-light" style={{ borderColor: '#394b59' }}>
          <div className="modal-header" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
            <h5 className="modal-title">
              Re-scrape Results
              <span className="badge bg-info ms-2" style={{ fontSize: '0.7rem' }}>{scraperName}</span>
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
          <div className="modal-body" style={{ backgroundColor: '#30404d', maxHeight: '70vh', overflowY: 'auto' }}>
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-info mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Scraping with {scraperName}...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger">
                <strong>Scraping Failed:</strong> {error}
              </div>
            ) : newMetadata ? (
              <>
                {/* Bulk actions */}
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: '#394b59' }}>
                  <div className="d-flex align-items-center gap-3">
                    <span style={{ color: '#8b9fad', fontSize: '0.85rem' }}>
                      Compare and select which values to keep:
                    </span>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showAllFields"
                        checked={showAll}
                        onChange={(e) => setShowAll(e.target.checked)}
                      />
                      <label className="form-check-label text-muted" htmlFor="showAllFields" style={{ fontSize: '0.8rem' }}>
                        Show all fields
                      </label>
                    </div>
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleSelectAll('original')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Keep All Original
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={() => handleSelectAll('new')}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Use All New
                    </button>
                  </div>
                </div>

                {/* Primary fields */}
                {(shouldShowField(originalMetadata?.title, newMetadata.title) ||
                  shouldShowField(originalMetadata?.description, newMetadata.description) ||
                  shouldShowField(originalMetadata?.date, newMetadata.date)) && (
                  <h6 className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>Basic Info</h6>
                )}
                {shouldShowField(originalMetadata?.title, newMetadata.title) &&
                  renderFieldComparison('title', 'Title', originalMetadata?.title, newMetadata.title)}
                {shouldShowField(originalMetadata?.description, newMetadata.description) &&
                  renderFieldComparison('description', 'Description', originalMetadata?.description, newMetadata.description)}
                {shouldShowField(originalMetadata?.date, newMetadata.date) &&
                  renderFieldComparison('date', 'Date', originalMetadata?.date, newMetadata.date)}

                {/* URLs - important to preserve */}
                {(shouldShowField(originalMetadata?.videoUrl, newMetadata.videoUrl) ||
                  shouldShowField(originalMetadata?.imageUrl, newMetadata.imageUrl) ||
                  shouldShowField(originalMetadata?.thumbnailUrl, newMetadata.thumbnailUrl)) && (
                  <h6 className="text-muted mb-2 mt-3" style={{ fontSize: '0.8rem' }}>Media URLs (preserve originals recommended)</h6>
                )}
                {shouldShowField(originalMetadata?.videoUrl, newMetadata.videoUrl) &&
                  renderFieldComparison(
                    'videoUrl',
                    'Video URL',
                    originalMetadata?.videoUrl ? `${originalMetadata.videoUrl.substring(0, 80)}...` : undefined,
                    newMetadata.videoUrl ? `${newMetadata.videoUrl.substring(0, 80)}...` : undefined
                  )}
                {shouldShowField(originalMetadata?.imageUrl, newMetadata.imageUrl) &&
                  renderFieldComparison(
                    'imageUrl',
                    'Image URL',
                    originalMetadata?.imageUrl ? `${originalMetadata.imageUrl.substring(0, 80)}...` : undefined,
                    newMetadata.imageUrl ? `${newMetadata.imageUrl.substring(0, 80)}...` : undefined
                  )}
                {shouldShowField(originalMetadata?.thumbnailUrl, newMetadata.thumbnailUrl) &&
                  renderFieldComparison(
                    'thumbnailUrl',
                    'Thumbnail',
                    originalMetadata?.thumbnailUrl ? `${originalMetadata.thumbnailUrl.substring(0, 60)}...` : undefined,
                    newMetadata.thumbnailUrl ? `${newMetadata.thumbnailUrl.substring(0, 60)}...` : undefined
                  )}

                {/* Entity data */}
                {(shouldShowArrayField(originalMetadata?.performers, newMetadata.performers) ||
                  shouldShowArrayField(originalMetadata?.tags, newMetadata.tags) ||
                  shouldShowField(originalMetadata?.studio, newMetadata.studio)) && (
                  <h6 className="text-muted mb-2 mt-3" style={{ fontSize: '0.8rem' }}>Metadata</h6>
                )}
                {shouldShowArrayField(originalMetadata?.performers, newMetadata.performers) &&
                  renderArrayComparison('performers', 'Performers', originalMetadata?.performers, newMetadata.performers)}
                {shouldShowArrayField(originalMetadata?.tags, newMetadata.tags) &&
                  renderArrayComparison('tags', 'Tags', originalMetadata?.tags, newMetadata.tags)}
                {shouldShowField(originalMetadata?.studio, newMetadata.studio) &&
                  renderFieldComparison('studio', 'Studio', originalMetadata?.studio, newMetadata.studio)}

                {/* Technical info */}
                {(shouldShowField(
                  originalMetadata?.duration ? `${originalMetadata.duration}s` : undefined,
                  newMetadata.duration ? `${newMetadata.duration}s` : undefined
                ) || shouldShowField(originalMetadata?.quality, newMetadata.quality)) && (
                  <h6 className="text-muted mb-2 mt-3" style={{ fontSize: '0.8rem' }}>Technical</h6>
                )}
                {shouldShowField(
                  originalMetadata?.duration ? `${originalMetadata.duration}s` : undefined,
                  newMetadata.duration ? `${newMetadata.duration}s` : undefined
                ) &&
                  renderFieldComparison(
                    'duration',
                    'Duration',
                    originalMetadata?.duration ? `${originalMetadata.duration}s` : undefined,
                    newMetadata.duration ? `${newMetadata.duration}s` : undefined
                  )}
                {shouldShowField(originalMetadata?.quality, newMetadata.quality) &&
                  renderFieldComparison('quality', 'Quality', originalMetadata?.quality, newMetadata.quality)}

                {/* Gallery */}
                {(originalMetadata?.galleryImages?.length || newMetadata.galleryImages?.length) &&
                  shouldShowField(
                    originalMetadata?.galleryImages?.length ? `${originalMetadata.galleryImages.length} images` : undefined,
                    newMetadata.galleryImages?.length ? `${newMetadata.galleryImages.length} images` : undefined
                  ) && (
                  <>
                    <h6 className="text-muted mb-2 mt-3" style={{ fontSize: '0.8rem' }}>Gallery</h6>
                    {renderFieldComparison(
                      'galleryImages',
                      'Gallery Images',
                      originalMetadata?.galleryImages?.length ? `${originalMetadata.galleryImages.length} images` : undefined,
                      newMetadata.galleryImages?.length ? `${newMetadata.galleryImages.length} images` : undefined
                    )}
                  </>
                )}

                {/* Message when no differences found */}
                {!showAll && (() => {
                  const hasDifferences =
                    shouldShowField(originalMetadata?.title, newMetadata.title) ||
                    shouldShowField(originalMetadata?.description, newMetadata.description) ||
                    shouldShowField(originalMetadata?.date, newMetadata.date) ||
                    shouldShowField(originalMetadata?.videoUrl, newMetadata.videoUrl) ||
                    shouldShowField(originalMetadata?.imageUrl, newMetadata.imageUrl) ||
                    shouldShowField(originalMetadata?.thumbnailUrl, newMetadata.thumbnailUrl) ||
                    shouldShowArrayField(originalMetadata?.performers, newMetadata.performers) ||
                    shouldShowArrayField(originalMetadata?.tags, newMetadata.tags) ||
                    shouldShowField(originalMetadata?.studio, newMetadata.studio) ||
                    shouldShowField(
                      originalMetadata?.duration ? `${originalMetadata.duration}s` : undefined,
                      newMetadata.duration ? `${newMetadata.duration}s` : undefined
                    ) ||
                    shouldShowField(originalMetadata?.quality, newMetadata.quality);

                  if (!hasDifferences) {
                    return (
                      <div className="alert alert-info mt-3" style={{ backgroundColor: 'rgba(13, 202, 240, 0.15)', borderColor: 'rgba(13, 202, 240, 0.3)' }}>
                        <strong>No differences found.</strong> The scraped metadata is identical to the original.
                        <br />
                        <small className="text-muted">Enable "Show all fields" to see all metadata.</small>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            ) : (
              <div className="text-center py-4 text-muted">
                Select a scraper to begin re-scraping
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleApply}
              disabled={isLoading || !!error || !newMetadata}
            >
              Apply Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
