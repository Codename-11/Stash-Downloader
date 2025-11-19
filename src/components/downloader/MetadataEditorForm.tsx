/**
 * MetadataEditorForm - Complete metadata editing form
 */

import React, { useState, useEffect } from 'react';
import type { IDownloadItem, IStashPerformer, IStashTag, IStashStudio } from '@/types';
import { PerformerSelector } from '@/components/common/PerformerSelector';
import { TagSelector } from '@/components/common/TagSelector';
import { StudioSelector } from '@/components/common/StudioSelector';

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
  const [title, setTitle] = useState(item.metadata?.title || '');
  const [description, setDescription] = useState(item.metadata?.description || '');
  const [date, setDate] = useState(item.metadata?.date || '');
  const [rating, setRating] = useState(0);
  const [performers, setPerformers] = useState<IStashPerformer[]>([]);
  const [tags, setTags] = useState<IStashTag[]>([]);
  const [studio, setStudio] = useState<IStashStudio | null>(null);

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
        <h5 className="mb-0">Edit Metadata</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {/* Preview thumbnail if available */}
          {item.metadata?.thumbnailUrl && (
            <div className="mb-3 text-center">
              <img
                src={item.metadata.thumbnailUrl}
                alt="Preview"
                className="img-thumbnail"
                style={{ maxHeight: '200px', maxWidth: '100%' }}
              />
            </div>
          )}

          {/* Source URL */}
          <div className="mb-3">
            <label className="form-label">Source URL</label>
            <input
              type="text"
              className="form-control"
              value={item.url}
              disabled
              readOnly
            />
          </div>

          {/* Title */}
          <div className="mb-3">
            <label htmlFor="title" className="form-label">
              Title *
            </label>
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
            <label htmlFor="description" className="form-label">
              Description
            </label>
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
            <label htmlFor="date" className="form-label">
              Date
            </label>
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
            <label className="form-label">Rating</label>
            <div className="d-flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={() => setRating(star * 20)}
                  style={{
                    backgroundColor: rating >= star * 20 ? '#ffc107' : 'transparent',
                  }}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary ms-2"
                  onClick={() => setRating(0)}
                >
                  Clear
                </button>
              )}
            </div>
            <small className="text-muted">Rating: {rating}/100</small>
          </div>

          {/* Performers */}
          <div className="mb-3">
            <PerformerSelector
              selectedPerformers={performers}
              onChange={setPerformers}
            />
          </div>

          {/* Tags */}
          <div className="mb-3">
            <TagSelector selectedTags={tags} onChange={setTags} />
          </div>

          {/* Studio */}
          <div className="mb-3">
            <StudioSelector selectedStudio={studio} onChange={setStudio} />
          </div>

          {/* Actions */}
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary">
              Save & Import to Stash
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
