/**
 * Results Grid Component
 */

import { stashColors } from '@stash-plugins/shared';
import { RATING_COLORS } from '@/constants';
import type { IBooruPost } from '@/types';

interface ResultsGridProps {
  posts: IBooruPost[];
  selectedIds: Set<number>;
  onSelectPost: (postId: number) => void;
  onAddToQueue: (post: IBooruPost) => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  posts,
  selectedIds,
  onSelectPost,
  onAddToQueue,
}) => {
  return (
    <div className="row g-3">
      {posts.map((post) => (
        <div key={post.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
          <PostCard
            post={post}
            isSelected={selectedIds.has(post.id)}
            onSelect={() => onSelectPost(post.id)}
            onAddToQueue={() => onAddToQueue(post)}
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
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  isSelected,
  onSelect,
  onAddToQueue,
}) => {
  const ratingColor = RATING_COLORS[post.rating] || RATING_COLORS.explicit;

  return (
    <div
      className="card h-100 position-relative"
      style={{
        backgroundColor: stashColors.cardBg,
        borderColor: isSelected ? '#0d6efd' : stashColors.border,
        borderWidth: isSelected ? 2 : 1,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
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
        className="position-absolute top-0 end-0 m-2 px-2 py-1 rounded small"
        style={{
          backgroundColor: ratingColor,
          color: '#fff',
          fontSize: '0.7rem',
          zIndex: 10,
        }}
      >
        {post.rating.charAt(0).toUpperCase()}
      </div>

      {/* Thumbnail */}
      <div
        className="card-img-top"
        style={{
          aspectRatio: '1',
          backgroundColor: stashColors.headerBg,
          backgroundImage: `url(${post.previewUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Video indicator */}
        {post.fileType === 'video' && (
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

      {/* Card body */}
      <div className="card-body p-2">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">#{post.id}</small>
          <button
            className="btn btn-sm btn-success py-0 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onAddToQueue();
            }}
            title="Add to Stash Downloader queue"
          >
            +
          </button>
        </div>
        {post.score !== undefined && (
          <small className="text-muted d-block">
            Score: {post.score}
          </small>
        )}
      </div>
    </div>
  );
};
