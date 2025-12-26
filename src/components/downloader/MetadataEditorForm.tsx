/**
 * MetadataEditorForm - Simplified preview and import options
 *
 * Focuses on:
 * - Preview (thumbnail, title, duration, quality)
 * - Post-import action selector (None, Identify, Scrape URL)
 * - URL display
 *
 * Metadata editing (performers, tags, studio) is handled by Stash after import.
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
}

export const MetadataEditorForm: React.FC<MetadataEditorFormProps> = ({
  item,
  onSave,
  onCancel,
  onRemove,
}) => {
  const { settings } = useSettings();
  const [title, setTitle] = useState(item.editedMetadata?.title || item.metadata?.title || '');
  const [postImportAction, setPostImportAction] = useState<PostImportAction>(item.postImportAction || 'scrape_url');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = useState('');

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
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const editedMetadata = {
      title: title.trim() || undefined,
      description: item.metadata?.description,
      date: item.metadata?.date,
    };

    debugLog.info('Submitting import with post-action:', postImportAction);
    onSave(editedMetadata, postImportAction);
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
        <h6 className="mb-0">Import Preview</h6>
        {onRemove && (
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
                {item.metadata?.videoUrl && item.metadata?.contentType === ContentType.Video && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => item.metadata?.videoUrl && handlePreview(item.metadata.videoUrl, 'video')}
                  >
                    ▶ Preview Video
                  </button>
                )}
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

            {/* Title (editable) */}
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
              />
            </div>

            {/* Post-Import Action */}
            <div>
              <label className="form-label" style={{ color: '#8b9fad' }}>
                After Import
              </label>
              <select
                className="form-select text-light"
                style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                value={postImportAction}
                onChange={(e) => setPostImportAction(e.target.value as PostImportAction)}
              >
                <option value="none">None - Just import file</option>
                <option value="scrape_url">Scrape URL - Use Stash scrapers for metadata</option>
                <option value="identify">Identify - Match via StashDB fingerprints</option>
              </select>
              <small className="text-muted d-block mt-1">
                {postImportAction === 'none' && 'File will be imported without metadata. Edit in Stash later.'}
                {postImportAction === 'scrape_url' && 'Stash will scrape the source URL for performers, tags, and studio.'}
                {postImportAction === 'identify' && 'Stash will match the video fingerprint against StashDB database.'}
              </small>
            </div>

            {/* Scraped Metadata Preview */}
            {item.metadata && (
              (item.metadata.performers?.length || item.metadata.tags?.length || item.metadata.studio) && (
                <div className="p-3 rounded" style={{ backgroundColor: '#243340', border: '1px solid #394b59' }}>
                  <small className="text-muted d-block mb-2">Scraped metadata (will be matched by Stash):</small>
                  <div className="d-flex gap-2 flex-wrap">
                    {item.metadata.performers?.length ? (
                      <span className="badge bg-primary">
                        👤 {item.metadata.performers.length} performer{item.metadata.performers.length > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {item.metadata.tags?.length ? (
                      <span className="badge bg-secondary">
                        🏷️ {item.metadata.tags.length} tag{item.metadata.tags.length > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {item.metadata.studio && (
                      <span className="badge bg-info">
                        🏢 {item.metadata.studio}
                      </span>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Actions */}
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-success flex-grow-1">
                📥 Import to Stash
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
