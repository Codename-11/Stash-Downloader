/**
 * Results Grid Component
 */

import React from 'react';
import type { IBooruPost } from '@/types';

interface ResultsGridProps {
  posts: IBooruPost[];
  selectedIds: Set<number>;
  onSelectPost: (postId: number) => void;
  onAddToQueue: (post: IBooruPost) => void;
  onViewDetail: (post: IBooruPost) => void;
  showThumbnails?: boolean;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  posts,
  selectedIds,
  onSelectPost,
  onAddToQueue,
  onViewDetail,
  showThumbnails = true,
}) => {
  return (
    <div className="results-grid">
      {posts.map((post, index) => (
        <div key={post.id} className="results-grid-item">
          <PostCard
            post={post}
            isSelected={selectedIds.has(post.id)}
            onSelect={() => onSelectPost(post.id)}
            onAddToQueue={() => onAddToQueue(post)}
            onViewDetail={() => onViewDetail(post)}
            index={index}
            showThumbnail={showThumbnails}
          />
        </div>
      ))}
    </div>
  );
};

interface PostCardProps {
  post: IBooruPost;
  isSelected: boolean;
  onSelect: () => void;
  onAddToQueue: () => void;
  onViewDetail: () => void;
  index: number;
  showThumbnail?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  isSelected,
  onSelect,
  onAddToQueue,
  onViewDetail,
  index,
  showThumbnail = true,
}) => {
  const ratingClass = `rating-${post.rating}`;

  return (
    <div
      className={`post-card card h-100 position-relative ${isSelected ? 'selected' : ''}`}
      style={{
        animationDelay: `${Math.min(index * 25, 300)}ms`,
      }}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onViewDetail();
      }}
    >
      {/* Selection checkbox */}
      <div
        className="position-absolute top-0 start-0 m-2"
        style={{ zIndex: 10 }}
      >
        <input
          type="checkbox"
          className="form-check-input"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 20, height: 20 }}
        />
      </div>

      {/* Rating badge */}
      <div
        className={`position-absolute top-0 end-0 m-2 px-2 py-1 rounded small ${ratingClass}`}
        style={{ fontSize: '0.7rem', zIndex: 10 }}
      >
        {post.rating.charAt(0).toUpperCase()}
      </div>

      {/* Thumbnail */}
      <div
        className="post-thumbnail card-img-top"
        style={{
          backgroundImage: showThumbnail ? `url(${post.previewUrl})` : 'none',
          backgroundColor: showThumbnail ? undefined : 'var(--stash-header-bg)',
        }}
      >
        {/* Hidden indicator when thumbnails disabled */}
        {!showThumbnail && (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
              <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
              <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
            </svg>
          </div>
        )}
        {/* Video indicator */}
        {showThumbnail && post.fileType === 'video' && (
          <div
            className="position-absolute bottom-0 start-0 m-2 px-2 py-1 rounded small"
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontSize: '0.7rem',
            }}
          >
            VIDEO
          </div>
        )}
      </div>

      {/* Card body - compact info bar */}
      <div className="card-body p-2">
        <div className="d-flex justify-content-between align-items-center">
          <div className="post-info">
            <span className="post-id">#{post.id}</span>
            {post.score !== undefined && post.score > 0 && (
              <span className="post-score">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                </svg>
                {post.score}
              </span>
            )}
          </div>
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail();
              }}
              title="View details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
              </svg>
            </button>
            <button
              className="btn btn-sm btn-success py-0 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onAddToQueue();
              }}
              title="Add to queue"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
