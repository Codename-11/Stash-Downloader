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

interface RedditImportProps {
  onImportPosts: (permalinks: string[]) => void;
}

export const RedditImport: React.FC<RedditImportProps> = ({ onImportPosts }) => {
  const [showModal, setShowModal] = useState(false);
  const [postType, setPostType] = useState<'saved' | 'upvoted'>('saved');
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prawAvailable, setPrawAvailable] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<RedditPost[]>( []);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const toast = useToast();
  const { settings } = useSettings();
  const redditService = getRedditImportService();

  // Check PRAW availability when modal opens
  useEffect(() => {
    if (showModal && prawAvailable === null) {
      checkPraw();
    }
  }, [showModal, prawAvailable]);

  const checkPraw = async () => {
    try {
      const available = await redditService.checkPrawAvailable();
      setPrawAvailable(available);
      if (!available) {
        setError('PRAW is not installed. Install with: pip install praw');
      }
    } catch (err) {
      log.error('Failed to check PRAW:', err instanceof Error ? err.message : String(err));
      setPrawAvailable(false);
      setError('Failed to check PRAW availability');
    }
  };

  const handleFetchPosts = async () => {
    setLoading(true);
    setError(null);
    setPosts([]);

    try {
      const credentials: RedditCredentials = {
        clientId: settings.redditClientId || '',
        clientSecret: settings.redditClientSecret || '',
        username: settings.redditUsername || '',
        password: settings.redditPassword || '',
      };

      const result = await redditService.fetchPosts(credentials, postType, limit);

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
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map(p => p.id)));
    }
  };

  const hasCredentials = settings.redditClientId && settings.redditClientSecret && 
                         settings.redditUsername && settings.redditPassword;

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
                  </div>

                  {error && (
                    <div className="alert alert-danger small" role="alert">
                      {error}
                    </div>
                  )}

                  {posts.length > 0 && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small text-muted">
                          {selectedPosts.size} of {posts.length} selected
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={toggleAll}
                        >
                          {selectedPosts.size === posts.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="border border-secondary rounded p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {posts.map((post) => (
                          <div
                            key={post.id}
                            className="form-check border-bottom border-secondary py-2"
                          >
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`post-${post.id}`}
                              checked={selectedPosts.has(post.id)}
                              onChange={() => togglePostSelection(post.id)}
                            />
                            <label
                              className="form-check-label small"
                              htmlFor={`post-${post.id}`}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="fw-bold">{post.title}</div>
                              <div className="text-muted">
                                r/{post.subreddit} • u/{post.author} • {post.score} points
                                {post.is_video && ' • Video'}
                                {post.is_gallery && ' • Gallery'}
                                {post.over_18 && ' • NSFW'}
                              </div>
                            </label>
                          </div>
                        ))}
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
