/**
 * RedditImport - Component for importing saved/upvoted posts from Reddit
 */

import React, { useState, useEffect } from 'react';
import { getRedditImportService } from '@/services/reddit';
import type { RedditPost, RedditCredentials } from '@/services/reddit';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/hooks';
import { createLogger } from '@/utils';

const log = createLogger('RedditImport');

type NSFWFilter = 'all' | 'sfw' | 'nsfw';
type ContentTypeFilter = 'all' | 'video' | 'image' | 'gallery';
type SortOrder = 'newest' | 'oldest' | 'score';

interface RedditImportProps {
  onImportPosts: (permalinks: string[]) => void;
}

export const RedditImport: React.FC<RedditImportProps> = ({ onImportPosts }) => {
  const [showModal, setShowModal] = useState(false);
  const [postType, setPostType] = useState<'saved' | 'upvoted'>('saved');
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prawAvailable, setPrawAvailable] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  
  // Filter state
  const [filterNSFW, setFilterNSFW] = useState<NSFWFilter>('all');
  const [filterContentType, setFilterContentType] = useState<ContentTypeFilter>('all');
  const [filterSubreddit, setFilterSubreddit] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  
  const toast = useToast();
  const { settings } = useSettings();
  const redditService = getRedditImportService();

  // Check PRAW availability when modal opens
  const checkPraw = React.useCallback(async () => {
    try {
      console.log('[RedditImport] Starting PRAW check...');
      const available = await redditService.checkPrawAvailable();
      console.log('[RedditImport] PRAW check result:', available);
      setPrawAvailable(available);
      if (!available) {
        setError('PRAW is not installed. Install with: pip install praw');
      } else {
        setError(null); // Clear error if PRAW is available
      }
    } catch (err) {
      console.error('[RedditImport] PRAW check failed:', err);
      log.error('Failed to check PRAW:', err instanceof Error ? err.message : String(err));
      setPrawAvailable(false);
      setError('Failed to check PRAW availability');
    }
  }, [redditService]);

  useEffect(() => {
    if (showModal && prawAvailable === null) {
      console.log('[RedditImport] Modal opened, clearing cache and checking PRAW...');
      redditService.clearCache(); // Force fresh check
      checkPraw();
    }
  }, [showModal, prawAvailable, checkPraw, redditService]);

  const handleFetchPosts = async () => {
    setLoading(true);
    setError(null);
    setPosts([]);
    setFetchProgress({ current: 0, total: limit });

    try {
      const credentials: RedditCredentials = {
        clientId: settings.redditClientId || '',
        clientSecret: settings.redditClientSecret || '',
        username: settings.redditUsername || '',
        password: settings.redditPassword || '',
      };

      // Simulate progress (PRAW doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setFetchProgress(prev => {
          if (!prev) return null;
          const newCurrent = Math.min(prev.current + 10, prev.total - 1);
          return { ...prev, current: newCurrent };
        });
      }, 500);

      const result = await redditService.fetchPosts(credentials, postType, limit);

      clearInterval(progressInterval);
      setFetchProgress(null);

      if (!result.success) {
        setError(result.error || 'Failed to fetch posts');
        toast.showToast('error', 'Reddit Import Failed', result.error || 'Unknown error');
        return;
      }

      setPosts(result.posts);
      setSelectedPosts(new Set(result.posts.map(p => p.id)));
      toast.showToast('success', 'Posts Fetched', `Found ${result.count} ${postType} posts`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('Failed to fetch Reddit posts:', errorMsg);
      setError(errorMsg);
      toast.showToast('error', 'Reddit Import Failed', errorMsg);
    } finally {
      setLoading(false);
      setFetchProgress(null);
    }
  };

  const handleImport = () => {
    const selectedPostsList = posts.filter(p => selectedPosts.has(p.id));
    if (selectedPostsList.length === 0) {
      setError('No posts selected');
      return;
    }

    const permalinks = selectedPostsList.map(p => p.permalink);
    onImportPosts(permalinks);
    
    toast.showToast('success', 'Reddit Import', `Importing ${permalinks.length} posts...`);
    handleClose();
  };

  const handleClose = () => {
    setShowModal(false);
    setPosts([]);
    setSelectedPosts(new Set());
    setError(null);
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    const filteredIds = new Set(filteredPosts.map(p => p.id));
    const allFilteredSelected = filteredPosts.every(p => selectedPosts.has(p.id));
    
    if (allFilteredSelected) {
      // Deselect all filtered posts
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all filtered posts
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const hasCredentials = settings.redditClientId && settings.redditClientSecret && 
                         settings.redditUsername && settings.redditPassword;

  // Apply filters and sorting
  const filteredPosts = posts
    .filter(post => {
      // NSFW filter
      if (filterNSFW === 'sfw' && post.over_18) return false;
      if (filterNSFW === 'nsfw' && !post.over_18) return false;

      // Content type filter
      if (filterContentType === 'video' && !post.is_video) return false;
      if (filterContentType === 'gallery' && !post.is_gallery) return false;
      if (filterContentType === 'image' && (post.is_video || post.is_gallery)) return false;

      // Subreddit filter
      if (filterSubreddit && !post.subreddit.toLowerCase().includes(filterSubreddit.toLowerCase())) return false;

      // Search query
      if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.created_utc - a.created_utc; // Most recent first
        case 'oldest':
          return a.created_utc - b.created_utc; // Oldest first
        case 'score':
          return b.score - a.score; // Highest score first
        default:
          return 0;
      }
    });

  // Get unique subreddits for filter
  const subreddits = Array.from(new Set(posts.map(p => p.subreddit))).sort();

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-info"
        onClick={() => setShowModal(true)}
        title="Import saved or upvoted posts from Reddit (requires API credentials)"
      >
        🔴 Import from Reddit
      </button>

      {showModal && (
        <>
          <div className="modal-backdrop fade show" onClick={handleClose} />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content bg-dark text-light">
                <div className="modal-header border-secondary">
                  <h5 className="modal-title">Import from Reddit</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={handleClose}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  {!hasCredentials && (
                    <div className="alert alert-warning" role="alert">
                      <strong>⚠️ Reddit API credentials not configured</strong>
                      <p className="mb-0 small mt-2">
                        Configure your Reddit API credentials in plugin settings to use this feature.
                        <br />
                        Get credentials from: <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-white">https://www.reddit.com/prefs/apps</a>
                      </p>
                    </div>
                  )}

                  {prawAvailable === false && (
                    <div className="alert alert-danger" role="alert">
                      <strong>❌ PRAW not installed</strong>
                      <p className="mb-0 small mt-2">
                        Install PRAW (Python Reddit API Wrapper) to use this feature:
                        <br />
                        <code>pip install praw</code>
                      </p>
                    </div>
                  )}

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Post Type</label>
                      <select
                        className="form-select form-select-sm bg-dark text-light border-secondary"
                        value={postType}
                        onChange={(e) => setPostType(e.target.value as 'saved' | 'upvoted')}
                        disabled={loading}
                      >
                        <option value="saved">Saved Posts</option>
                        <option value="upvoted">Upvoted Posts</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-muted">Limit</label>
                      <input
                        type="number"
                        className="form-control form-control-sm bg-dark text-light border-secondary"
                        value={limit}
                        onChange={(e) => setLimit(Math.max(1, Math.min(1000, parseInt(e.target.value) || 100)))}
                        min="1"
                        max="1000"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm w-100"
                      onClick={handleFetchPosts}
                      disabled={loading || !hasCredentials || prawAvailable === false}
                    >
                      {loading ? '⏳ Fetching...' : `Fetch ${postType === 'saved' ? 'Saved' : 'Upvoted'} Posts`}
                    </button>
                    
                    {fetchProgress && (
                      <div className="mt-2">
                        <div className="progress" style={{ height: '20px' }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated"
                            role="progressbar"
                            style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                            aria-valuenow={fetchProgress.current}
                            aria-valuemin={0}
                            aria-valuemax={fetchProgress.total}
                          >
                            {fetchProgress.current} / {fetchProgress.total}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="alert alert-danger small" role="alert">
                      {error}
                    </div>
                  )}

                  {posts.length > 0 && (
                    <>
                      {/* Filters */}
                      <div className="border border-secondary rounded p-3 mb-3">
                        <h6 className="small text-muted mb-2">Filters & Sort</h6>
                        <div className="row g-2">
                          <div className="col-md-3">
                            <label className="form-label small text-muted mb-1">Sort By</label>
                            <select
                              className="form-select form-select-sm bg-dark text-light border-secondary"
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                            >
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="score">Highest Score</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small text-muted mb-1">NSFW Filter</label>
                            <select
                              className="form-select form-select-sm bg-dark text-light border-secondary"
                              value={filterNSFW}
                              onChange={(e) => setFilterNSFW(e.target.value as NSFWFilter)}
                            >
                              <option value="all">All Posts</option>
                              <option value="sfw">SFW Only</option>
                              <option value="nsfw">NSFW Only</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small text-muted mb-1">Content Type</label>
                            <select
                              className="form-select form-select-sm bg-dark text-light border-secondary"
                              value={filterContentType}
                              onChange={(e) => setFilterContentType(e.target.value as ContentTypeFilter)}
                            >
                              <option value="all">All Types</option>
                              <option value="video">Videos</option>
                              <option value="image">Images</option>
                              <option value="gallery">Galleries</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small text-muted mb-1">Subreddit</label>
                            <select
                              className="form-select form-select-sm bg-dark text-light border-secondary"
                              value={filterSubreddit}
                              onChange={(e) => setFilterSubreddit(e.target.value)}
                            >
                              <option value="">All Subreddits</option>
                              {subreddits.map(sub => (
                                <option key={sub} value={sub}>r/{sub}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="row g-2 mt-1">
                          <div className="col-md-12">
                            <label className="form-label small text-muted mb-1">Search Titles</label>
                            <input
                              type="text"
                              className="form-control form-control-sm bg-dark text-light border-secondary"
                              placeholder="Search titles..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>
                        {(filterNSFW !== 'all' || filterContentType !== 'all' || filterSubreddit || searchQuery || sortOrder !== 'newest') && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm mt-2"
                            onClick={() => {
                              setFilterNSFW('all');
                              setFilterContentType('all');
                              setFilterSubreddit('');
                              setSearchQuery('');
                              setSortOrder('newest');
                            }}
                          >
                            Reset All
                          </button>
                        )}
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">
                          {selectedPosts.size} of {filteredPosts.length} selected
                          {filteredPosts.length !== posts.length && ` (${posts.length} total)`}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={toggleAll}
                        >
                          {selectedPosts.size === filteredPosts.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="border border-secondary rounded p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {filteredPosts.length === 0 ? (
                          <div className="text-center text-muted py-4">
                            No posts match the current filters
                          </div>
                        ) : (
                          filteredPosts.map((post) => (
                            <div
                              key={post.id}
                              className="form-check border-bottom border-secondary py-2 d-flex align-items-start"
                            >
                              <input
                                className="form-check-input mt-1 flex-shrink-0"
                                type="checkbox"
                                id={`post-${post.id}`}
                                checked={selectedPosts.has(post.id)}
                                onChange={() => togglePostSelection(post.id)}
                                style={{ marginRight: '10px' }}
                              />
                              {(post.thumbnail || post.preview_image) && (
                                <img
                                  src={post.preview_image || post.thumbnail}
                                  alt={post.title}
                                  className="flex-shrink-0"
                                  style={{
                                    width: '80px',
                                    height: '80px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    marginRight: '12px',
                                    backgroundColor: '#1a1a1a'
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              )}
                              <label
                                className="form-check-label small flex-grow-1"
                                htmlFor={`post-${post.id}`}
                                style={{ cursor: 'pointer', minWidth: 0 }}
                              >
                                <div className="fw-bold text-truncate" title={post.title}>{post.title}</div>
                                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                  <a 
                                    href={`https://reddit.com${post.permalink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-info text-decoration-none me-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    r/{post.subreddit}
                                  </a>
                                  • u/{post.author} • {post.score} pts
                                  {post.is_video && ' • 🎥 Video'}
                                  {post.is_gallery && ' • 🖼️ Gallery'}
                                  {post.over_18 && ' • 🔞 NSFW'}
                                </div>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer border-secondary">
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={selectedPosts.size === 0}
                  >
                    Import {selectedPosts.size} Posts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
