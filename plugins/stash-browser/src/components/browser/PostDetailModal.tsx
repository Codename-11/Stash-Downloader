/**
 * Post Detail Modal Component
 */

import React, { useCallback } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { RATING_COLORS } from '@/constants';
import type { IBooruPost } from '@/types';
import { getPostUrl } from '@/services/BooruService';

interface PostDetailModalProps {
  post: IBooruPost | null;
  onClose: () => void;
  onAddToQueue: (post: IBooruPost) => void;
  onTagClick: (tag: string) => void;
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
  onTagClick,
}) => {
  const handleOpenInBrowser = useCallback(() => {
    if (post) {
      const url = getPostUrl(post);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [post]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  if (!post) return null;

  const ratingColor = RATING_COLORS[post.rating] || RATING_COLORS.explicit;
  const isVideo = post.fileType === 'video';

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="d-flex gap-3"
        style={{ maxWidth: '95vw', maxHeight: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media Container */}
        <div
          className="d-flex align-items-center justify-content-center"
          style={{
            maxWidth: '70vw',
            maxHeight: '90vh',
            backgroundColor: '#000',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {isVideo ? (
            <video
              src={post.fileUrl}
              controls
              autoPlay
              loop
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
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
          className="card h-100"
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

            {/* Tags */}
            <div className="mb-3">
              <h6 className="text-light mb-2">Tags ({post.tags.length})</h6>
              <div className="d-flex flex-wrap gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {post.tags.map((tag) => (
                  <button
                    key={tag}
                    className="btn btn-sm py-0 px-2"
                    style={{
                      backgroundColor: stashColors.headerBg,
                      borderColor: stashColors.border,
                      color: CATEGORY_COLORS[0], // Default to general color
                      fontSize: '0.75rem',
                    }}
                    onClick={() => onTagClick(tag)}
                    title={`Search for ${tag}`}
                  >
                    {tag.replace(/_/g, ' ')}
                  </button>
                ))}
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
  );
};
