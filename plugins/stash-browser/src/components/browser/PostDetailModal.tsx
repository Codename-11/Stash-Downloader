/**
 * Post Detail Modal Component
 */

import React, { useCallback, useEffect, useState } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { RATING_COLORS } from '@/constants';
import type { IBooruPost } from '@/types';
import { getPostUrl } from '@/services/BooruService';

interface PostDetailModalProps {
  post: IBooruPost | null;
  onClose: () => void;
  onAddToQueue: (post: IBooruPost) => void;
  /** Current search tags for the tag editor */
  currentSearchTags?: string[];
  /** Called when user wants to update search with new tags */
  onUpdateSearch?: (tags: string[]) => void;
  /** Whether to show thumbnails/preview images */
  showThumbnails?: boolean;
}

// Tag category colors (booru convention)
const CATEGORY_COLORS: Record<number, string> = {
  0: '#0075f8', // General (blue)
  1: '#e00',    // Artist (red)
  3: '#a0a',    // Copyright/Series (purple)
  4: '#0a0',    // Character (green)
  5: '#f80',    // Meta (orange)
};

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  onClose,
  onAddToQueue,
  currentSearchTags = [],
  onUpdateSearch,
  showThumbnails = true,
}) => {
  // Pending tags for the tag editor
  const [pendingTags, setPendingTags] = useState<string[]>([]);

  // Reset pending tags when modal opens/closes
  useEffect(() => {
    if (post) {
      setPendingTags([...currentSearchTags]);
    } else {
      setPendingTags([]);
    }
  }, [post, currentSearchTags]);

  const handleAddTag = useCallback((tag: string) => {
    setPendingTags(prev => {
      if (prev.includes(tag)) return prev;
      return [...prev, tag];
    });
  }, []);

  const handleRemoveTag = useCallback((tag: string) => {
    setPendingTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleUpdateSearch = useCallback(() => {
    if (onUpdateSearch) {
      onUpdateSearch(pendingTags);
    }
    onClose();
  }, [pendingTags, onUpdateSearch, onClose]);

  // Check if pending tags differ from current
  const hasPendingChanges = JSON.stringify(pendingTags.sort()) !== JSON.stringify([...currentSearchTags].sort());

  const handleOpenInBrowser = useCallback(() => {
    if (post) {
      const url = getPostUrl(post);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [post]);

  // Handle body class for modal-open
  useEffect(() => {
    if (post) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [post]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && post) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [post, onClose]);

  if (!post) return null;

  console.log('[StashBrowser] PostDetailModal rendering for post:', post.id);

  const ratingColor = RATING_COLORS[post.rating] || RATING_COLORS.explicit;
  const isVideo = post.fileType === 'video';

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          style={{ maxWidth: 'fit-content', margin: 'auto' }}
        >
          <div
            className="d-flex gap-3"
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media Container */}
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                maxWidth: '70vw',
                maxHeight: '90vh',
                backgroundColor: showThumbnails ? '#000' : stashColors.headerBg,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {!showThumbnails ? (
                // Hidden thumbnail placeholder
                <div
                  className="d-flex flex-column align-items-center justify-content-center text-muted"
                  style={{
                    minWidth: 400,
                    minHeight: 300,
                    padding: '2rem',
                  }}
                >
                  {/* Eye-slash icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="64"
                    height="64"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    className="mb-3"
                    style={{ opacity: 0.5 }}
                  >
                    <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.088z"/>
                    <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.707z"/>
                  </svg>
                  <span style={{ fontSize: '1rem' }}>Preview Hidden</span>
                  <small className="mt-1" style={{ opacity: 0.7 }}>
                    {isVideo ? 'Video' : 'Image'} • {post.width} x {post.height}
                  </small>
                  <a
                    href={post.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-secondary btn-sm mt-3"
                  >
                    View Full Size
                  </a>
                </div>
              ) : isVideo ? (
                // Video placeholder - can't embed due to CSP restrictions
                <div
                  className="position-relative d-flex flex-column align-items-center justify-content-center"
                  style={{
                    minWidth: 400,
                    minHeight: 300,
                    backgroundColor: '#1a1a1a',
                    padding: '2rem',
                  }}
                >
                  {/* Preview thumbnail if available */}
                  {post.previewUrl && (
                    <img
                      src={post.previewUrl}
                      alt={`Preview ${post.id}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '50vh',
                        objectFit: 'contain',
                        opacity: 0.7,
                        borderRadius: 4,
                      }}
                    />
                  )}

                  {/* Play button overlay */}
                  <div
                    className="position-absolute d-flex flex-column align-items-center justify-content-center"
                    style={{
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                    }}
                  >
                    <a
                      href={post.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-lg rounded-circle d-flex align-items-center justify-content-center mb-3"
                      style={{
                        width: 80,
                        height: 80,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#000',
                      }}
                      title="Open video in new tab"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                      </svg>
                    </a>

                    <div className="text-center">
                      <span className="badge bg-info mb-2" style={{ fontSize: '1rem' }}>
                        VIDEO
                      </span>
                      <p className="text-light mb-1" style={{ fontSize: '0.9rem' }}>
                        {post.width} x {post.height}
                      </p>
                      <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                        Click play to open in new tab
                      </p>
                      <p className="text-muted" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                        (Video preview blocked by browser security)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={post.sampleUrl || post.fileUrl}
                  alt={`Post ${post.id}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                  }}
                  loading="lazy"
                />
              )}
            </div>

            {/* Info Panel */}
            <div
              className="card"
              style={{
                backgroundColor: stashColors.cardBg,
                minWidth: 300,
                maxWidth: 400,
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{ backgroundColor: stashColors.headerBg, borderColor: stashColors.border }}
              >
                <span className="text-light fw-bold">#{post.id}</span>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={onClose}
                  aria-label="Close"
                />
              </div>

              {/* Body - Scrollable */}
              <div className="card-body" style={{ overflowY: 'auto', flex: 1 }}>
                {/* Metadata */}
                <div className="mb-3">
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {/* Rating Badge */}
                    <span
                      className="badge"
                      style={{ backgroundColor: ratingColor }}
                    >
                      {post.rating}
                    </span>
                    {/* Type Badge */}
                    {isVideo && (
                      <span className="badge bg-info">VIDEO</span>
                    )}
                    {/* Score */}
                    {post.score !== undefined && (
                      <span className="badge bg-secondary">
                        Score: {post.score}
                      </span>
                    )}
                  </div>

                  {/* Dimensions */}
                  {post.width > 0 && post.height > 0 && (
                    <small className="text-muted d-block">
                      {post.width} x {post.height}
                    </small>
                  )}

                  {/* Source */}
                  <small className="text-muted d-block">
                    Source: {post.source}
                  </small>
                </div>

                {/* Pending Tags Editor */}
                {pendingTags.length > 0 && (
                  <div className="mb-3 p-2 rounded" style={{ backgroundColor: stashColors.headerBg, border: `1px solid ${stashColors.border}` }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">Search Tags</small>
                      {hasPendingChanges && (
                        <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>Modified</span>
                      )}
                    </div>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {pendingTags.map((tag) => (
                        <span
                          key={tag}
                          className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded"
                          style={{
                            backgroundColor: stashColors.cardBg,
                            border: `1px solid ${stashColors.border}`,
                            fontSize: '0.75rem',
                            color: '#6ea8fe',
                          }}
                        >
                          {tag.replace(/_/g, ' ')}
                          <button
                            type="button"
                            className="btn-close btn-close-white p-0 ms-1"
                            style={{ fontSize: '0.5rem', opacity: 0.7 }}
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`Remove ${tag}`}
                          />
                        </span>
                      ))}
                    </div>
                    <button
                      className="btn btn-sm btn-primary w-100"
                      onClick={handleUpdateSearch}
                      disabled={!hasPendingChanges && pendingTags.length === currentSearchTags.length}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="me-1" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                      </svg>
                      Update Search
                    </button>
                  </div>
                )}

                {/* Tags */}
                <div className="mb-3">
                  <h6 className="text-light mb-2">Tags ({post.tags.length})</h6>
                  <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {post.tags.map((tag) => {
                      const isInSearch = pendingTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          className="btn btn-sm py-0 px-2"
                          style={{
                            backgroundColor: isInSearch ? 'rgba(13, 110, 253, 0.2)' : stashColors.headerBg,
                            borderColor: isInSearch ? '#0d6efd' : stashColors.border,
                            color: isInSearch ? '#6ea8fe' : CATEGORY_COLORS[0],
                            fontSize: '0.75rem',
                          }}
                          onClick={() => isInSearch ? handleRemoveTag(tag) : handleAddTag(tag)}
                          title={isInSearch ? `Remove "${tag}" from search` : `Add "${tag}" to search`}
                        >
                          {isInSearch && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" className="me-1" viewBox="0 0 16 16">
                              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                            </svg>
                          )}
                          {tag.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer - Actions */}
              <div
                className="card-footer d-flex flex-column gap-2"
                style={{ backgroundColor: stashColors.headerBg, borderColor: stashColors.border }}
              >
                <button
                  className="btn btn-success w-100"
                  onClick={() => {
                    onAddToQueue(post);
                    onClose();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Add to Queue
                </button>
                <button
                  className="btn btn-outline-light w-100"
                  onClick={handleOpenInBrowser}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                    <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                  </svg>
                  Open in Browser
                </button>
                <a
                  href={post.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary w-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                    <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z"/>
                    <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z"/>
                  </svg>
                  View Full Size
                </a>
              </div>
            </div>
          </div>
        </div>
        </div>
      </>
    );
};
