/**
 * MetadataEditorForm - Preview and edit metadata before import
 *
 * Features:
 * - Preview (thumbnail, title, duration, quality)
 * - Editable performers, tags, studio
 * - Post-import action selector (None, Identify, Scrape URL)
 */

import React, { useState, useEffect } from 'react';
import type { IDownloadItem, PostImportAction } from '@/types';
import { ContentType } from '@/types';
import { MediaPreviewModal } from '@/components/common';
import { useSettings } from '@/hooks';
import { createLogger } from '@/utils';

const debugLog = createLogger('MetadataEditor');

interface MetadataEditorFormProps {
  item: IDownloadItem;
  onSave: (editedMetadata: IDownloadItem['editedMetadata'], postImportAction: PostImportAction) => void;
  onCancel: () => void;
  onRemove?: () => void;
  readOnly?: boolean;
}

export const MetadataEditorForm: React.FC<MetadataEditorFormProps> = ({
  item,
  onSave,
  onCancel,
  onRemove,
  readOnly = false,
}) => {
  const { settings } = useSettings();
  const [title, setTitle] = useState(item.editedMetadata?.title || item.metadata?.title || '');
  const [postImportAction, setPostImportAction] = useState<PostImportAction>(item.postImportAction || 'none');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = useState('');

  // Editable metadata state
  const [performers, setPerformers] = useState<string[]>(item.metadata?.performers || []);
  const [tags, setTags] = useState<string[]>(item.metadata?.tags || []);
  const [studio, setStudio] = useState<string>(item.metadata?.studio || '');

  // Input state for adding new items
  const [newPerformer, setNewPerformer] = useState('');
  const [newTag, setNewTag] = useState('');

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    performers: false,
    tags: false,
  });

  const handlePreview = (url: string, type: 'image' | 'video') => {
    setPreviewUrl(url);
    setPreviewType(type);
    setPreviewOpen(true);
  };

  // Initialize with existing data
  useEffect(() => {
    if (item.editedMetadata?.title) {
      setTitle(item.editedMetadata.title);
    } else if (item.metadata?.title) {
      setTitle(item.metadata.title);
    }
    if (item.postImportAction) {
      setPostImportAction(item.postImportAction);
    }
    // Initialize editable metadata from scraped data
    setPerformers(item.metadata?.performers || []);
    setTags(item.metadata?.tags || []);
    setStudio(item.metadata?.studio || '');
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const editedMetadata = {
      title: title.trim() || undefined,
      description: item.metadata?.description,
      date: item.metadata?.date,
      // Include edited performers, tags, studio as string arrays
      // These will be resolved to IDs during import
      performerNames: performers,
      tagNames: tags,
      studioName: studio || undefined,
    };

    debugLog.info('Submitting import with post-action:', postImportAction);
    debugLog.info('Edited metadata:', JSON.stringify({
      performers: performers.length,
      tags: tags.length,
      studio: studio || '(none)',
    }));
    onSave(editedMetadata, postImportAction);
  };

  // Helper functions for editing
  const addPerformer = () => {
    const trimmed = newPerformer.trim();
    if (trimmed && !performers.includes(trimmed)) {
      setPerformers([...performers, trimmed]);
      setNewPerformer('');
    }
  };

  const removePerformer = (name: string) => {
    setPerformers(performers.filter(p => p !== name));
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (name: string) => {
    setTags(tags.filter(t => t !== name));
  };

  const toggleSection = (section: 'performers' | 'tags') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get hostname from URL
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="card text-light" style={{ backgroundColor: '#30404d', borderColor: '#394b59' }}>
      <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#243340', borderColor: '#394b59' }}>
        <h6 className="mb-0">{readOnly ? 'Imported Metadata' : 'Import Preview'}</h6>
        <div className="d-flex gap-2">
          {/* View in Stash link for imported items */}
          {readOnly && item.stashId && (
            <a
              href={`/${item.metadata?.contentType === ContentType.Image ? 'images' : item.metadata?.contentType === ContentType.Gallery ? 'galleries' : 'scenes'}/${item.stashId}`}
              className="btn btn-sm btn-outline-success"
              title="Open in Stash"
              target="_blank"
              rel="noopener noreferrer"
            >
              🔗 View in Stash
            </a>
          )}
          {!readOnly && onRemove && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={onRemove}
              title="Remove from queue"
            >
              🗑️ Remove
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-column gap-3">
            {/* Preview Section */}
            <div className="d-flex gap-3 align-items-start">
              {/* Thumbnail */}
              {item.metadata?.thumbnailUrl && settings.showThumbnailPreviews ? (
                <img
                  src={item.metadata.thumbnailUrl}
                  alt="Preview"
                  style={{
                    width: '160px',
                    height: '100px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    border: '1px solid #394b59',
                    flexShrink: 0,
                  }}
                  onClick={() => item.metadata?.thumbnailUrl && handlePreview(item.metadata.thumbnailUrl, 'image')}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  title="Click to view full size"
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: '160px',
                    height: '100px',
                    backgroundColor: '#243340',
                    borderRadius: '4px',
                    border: '1px solid #394b59',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '32px', opacity: 0.5 }}>
                    {item.metadata?.contentType === ContentType.Image ? '🖼️' :
                     item.metadata?.contentType === ContentType.Gallery ? '📁' : '🎬'}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-grow-1">
                <h5 className="mb-1" style={{ wordBreak: 'break-word' }}>
                  {item.metadata?.title || 'Untitled'}
                </h5>
                <div className="d-flex gap-2 flex-wrap mb-2">
                  {item.metadata?.duration && (
                    <span className="badge bg-secondary">
                      ⏱ {formatDuration(item.metadata.duration)}
                    </span>
                  )}
                  {item.metadata?.quality && (
                    <span className="badge bg-success">
                      📺 {item.metadata.quality}
                    </span>
                  )}
                  {item.metadata?.contentType && (
                    <span className="badge bg-info">
                      {item.metadata.contentType === ContentType.Video ? '🎥 Video' :
                       item.metadata.contentType === ContentType.Image ? '🖼️ Image' : '📁 Gallery'}
                    </span>
                  )}
                </div>
                <small className="text-muted d-block">
                  Source: {getHostname(item.url)}
                </small>
              </div>
            </div>

            {/* URL Display */}
            <div>
              <label className="form-label" style={{ color: '#8b9fad' }}>Source URL</label>
              <input
                type="text"
                className="form-control text-light"
                style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                value={item.url}
                disabled
              />
            </div>

            {/* Title (editable unless readOnly) */}
            <div>
              <label htmlFor="title" className="form-label" style={{ color: '#8b9fad' }}>
                Title
              </label>
              <input
                id="title"
                type="text"
                className="form-control text-light"
                style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                value={title}
                onChange={(e) => !readOnly && setTitle(e.target.value)}
                placeholder="Enter title..."
                readOnly={readOnly}
              />
            </div>

            {/* Post-Import Action - hide in read-only mode */}
            {!readOnly && (
              <div>
                <label className="form-label" style={{ color: '#8b9fad' }}>
                  Additional Processing
                </label>
                <select
                  className="form-select text-light"
                  style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                  value={postImportAction}
                  onChange={(e) => setPostImportAction(e.target.value as PostImportAction)}
                >
                  <option value="none">None - Keep scraped metadata only</option>
                  <option value="identify">Identify - Also match via StashDB fingerprints</option>
                  <option value="scrape_url">Scrape URL - Also try Stash scrapers</option>
                </select>
                <small className="text-muted d-block mt-1">
                  {postImportAction === 'none' && 'Scraped metadata (performers, tags, studio) will be applied. No additional processing.'}
                  {postImportAction === 'identify' && 'After applying scraped metadata, Stash will also match fingerprints against StashDB.'}
                  {postImportAction === 'scrape_url' && 'After applying scraped metadata, Stash will also try its scrapers (may find additional info).'}
                </small>
              </div>
            )}

            {/* Performers Section */}
            <div className="p-3 rounded" style={{ backgroundColor: '#243340', border: '1px solid #394b59' }}>
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleSection('performers')}
              >
                <label className="form-label mb-0" style={{ color: '#8b9fad', cursor: 'pointer' }}>
                  👤 Performers ({performers.length})
                </label>
                <span style={{ color: '#8b9fad' }}>
                  {expandedSections.performers ? '▼' : '▶'}
                </span>
              </div>

              {expandedSections.performers && (
                <div className="mt-2">
                  {/* List of performers */}
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {performers.map((name) => (
                      <span
                        key={name}
                        className="badge bg-primary d-flex align-items-center gap-1"
                        style={{ fontSize: '0.85rem' }}
                      >
                        {name}
                        {!readOnly && (
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: '0.5rem', padding: '0.25rem' }}
                            onClick={() => removePerformer(name)}
                            title="Remove"
                          />
                        )}
                      </span>
                    ))}
                    {performers.length === 0 && (
                      <small className="text-muted">No performers</small>
                    )}
                  </div>

                  {/* Add performer input - only in edit mode */}
                  {!readOnly && (
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control text-light"
                        style={{ backgroundColor: '#1a2530', borderColor: '#394b59' }}
                        placeholder="Add performer..."
                        value={newPerformer}
                        onChange={(e) => setNewPerformer(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerformer())}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={addPerformer}
                        disabled={!newPerformer.trim()}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tags Section */}
            <div className="p-3 rounded" style={{ backgroundColor: '#243340', border: '1px solid #394b59' }}>
              <div
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleSection('tags')}
              >
                <label className="form-label mb-0" style={{ color: '#8b9fad', cursor: 'pointer' }}>
                  🏷️ Tags ({tags.length})
                </label>
                <span style={{ color: '#8b9fad' }}>
                  {expandedSections.tags ? '▼' : '▶'}
                </span>
              </div>

              {expandedSections.tags && (
                <div className="mt-2">
                  {/* List of tags */}
                  <div className="d-flex flex-wrap gap-1 mb-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {tags.map((name) => (
                      <span
                        key={name}
                        className="badge bg-secondary d-flex align-items-center gap-1"
                        style={{ fontSize: '0.8rem' }}
                      >
                        {name}
                        {!readOnly && (
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: '0.45rem', padding: '0.2rem' }}
                            onClick={() => removeTag(name)}
                            title="Remove"
                          />
                        )}
                      </span>
                    ))}
                    {tags.length === 0 && (
                      <small className="text-muted">No tags</small>
                    )}
                  </div>

                  {/* Add tag input - only in edit mode */}
                  {!readOnly && (
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control text-light"
                        style={{ backgroundColor: '#1a2530', borderColor: '#394b59' }}
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={addTag}
                        disabled={!newTag.trim()}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Studio Section */}
            <div>
              <label className="form-label" style={{ color: '#8b9fad' }}>
                🏢 Studio
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control text-light"
                  style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                  placeholder={readOnly ? '(none)' : 'Studio name...'}
                  value={studio}
                  onChange={(e) => !readOnly && setStudio(e.target.value)}
                  readOnly={readOnly}
                />
                {!readOnly && studio && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setStudio('')}
                    title="Clear studio"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            {!readOnly && (
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success flex-grow-1">
                  📥 Import to Stash
                </button>
                <button type="button" className="btn btn-outline-light" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            )}
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
