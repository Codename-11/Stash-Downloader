/**
 * Stash Browser - Main Component
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PLUGIN_NAME, APP_VERSION, DOWNLOADER_EVENTS, type SourceType } from '@/constants';
import type { IBooruPost, ISearchParams, SortOption, RatingFilter, MediaTypeFilter } from '@/types';
import { searchPosts, getPostUrl } from '@/services/BooruService';
import { SearchBar } from './SearchBar';
import { ResultsGrid } from './ResultsGrid';
import { SettingsPanel } from './SettingsPanel';
import { loadSettings, saveSettings, type BrowserSettings } from '@/utils';
import { PostDetailModal } from './PostDetailModal';
import { SkeletonGrid } from './SkeletonGrid';
import logoSvg from '@/assets/logo.svg';

export const BrowserMain: React.FC = () => {
  // Settings
  const [settings, setSettings] = useState<BrowserSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  // Search state - initialize from settings
  const [searchParams, setSearchParams] = useState<ISearchParams>(() => ({
    source: settings.defaultSource,
    tags: '',
    page: 0,
    limit: settings.resultsPerPage,
  }));

  // Update search params when settings change
  useEffect(() => {
    setSearchParams(prev => ({
      ...prev,
      limit: settings.resultsPerPage,
    }));
  }, [settings.resultsPerPage]);

  // Results state
  const [posts, setPosts] = useState<IBooruPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Detail modal state
  const [detailPost, setDetailPost] = useState<IBooruPost | null>(null);

  // Infinite scroll ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (params: ISearchParams, append = false) => {
    setSearchParams(params);

    // If this is a new search (page 0), show full loading state
    // If appending, show "loading more" state
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setPosts([]); // Clear posts for new search
      setHasMore(true);
    }
    setError(null);
    setHasSearched(true);

    // Build search query with filters
    let searchTags = params.tags;

    // Apply sort filter
    // Rule34/Gelbooru use sort:field format, Danbooru uses order:field
    // Always add sort parameter - default is NOT by score for most boorus
    if (params.sort) {
      if (params.source === 'danbooru') {
        // Danbooru uses order: prefix
        searchTags = `${searchTags} order:${params.sort}`.trim();
      } else {
        // Rule34/Gelbooru use sort: prefix
        searchTags = `${searchTags} sort:${params.sort}`.trim();
      }
    }

    // Apply rating filter (from search bar or settings safe mode)
    if (params.rating && params.rating !== 'all') {
      searchTags = `${searchTags} rating:${params.rating}`.trim();
    } else if (settings.safeMode && !searchTags.includes('rating:')) {
      searchTags = `${searchTags} rating:safe`.trim();
    }

    try {
      console.log('[StashBrowser] Searching:', { ...params, tags: searchTags, append });

      const result = await searchPosts(
        params.source,
        searchTags,
        params.page,
        params.limit
      );

      console.log('[StashBrowser] Got results:', result.count, 'posts');

      // Filter by media type (client-side since booru APIs don't support this)
      // 'image' includes both static images and GIFs
      let filteredPosts = result.posts;
      if (params.mediaType && params.mediaType !== 'all') {
        filteredPosts = result.posts.filter(p => {
          if (params.mediaType === 'video') {
            return p.fileType === 'video';
          } else if (params.mediaType === 'image') {
            return p.fileType === 'image' || p.fileType === 'gif';
          }
          return true;
        });
        console.log('[StashBrowser] Filtered to', filteredPosts.length, params.mediaType, 'posts');
      }

      if (append) {
        // Append new posts, filtering out duplicates
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = filteredPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      } else {
        setPosts(filteredPosts);
      }

      setTotalCount(prev => append ? prev : result.count);

      // Check if there are more results
      // Use the service's hasMore flag (true if we got a full page of results)
      // When filtering by media type, we may show fewer posts but should still load more
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[StashBrowser] Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      if (!append) {
        setPosts([]);
        setTotalCount(0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [settings.safeMode, posts.length]);

  const handleSourceChange = useCallback((source: SourceType) => {
    const newParams = { ...searchParams, source, page: 0 };
    setSearchParams(newParams);
  }, [searchParams]);

  // Load more for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !hasSearched) return;

    const nextPage = searchParams.page + 1;
    const newParams = { ...searchParams, page: nextPage };
    handleSearch(newParams, true); // true = append mode
  }, [searchParams, handleSearch, isLoading, isLoadingMore, hasMore, hasSearched]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [handleLoadMore, hasMore, isLoading, isLoadingMore]);

  const handleSelectPost = useCallback((postId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleAddToQueue = useCallback((post: IBooruPost) => {
    // Get the source page URL for this post
    const sourceUrl = getPostUrl(post);
    const contentType = post.fileType === 'video' ? 'Video' : 'Image';

    // Use localStorage to communicate with Stash Downloader (works cross-page)
    // This is the same mechanism the browser extension uses
    const EXTERNAL_QUEUE_KEY = 'stash-downloader-external-queue';

    try {
      // Get existing queue or create new one
      const existingQueue = localStorage.getItem(EXTERNAL_QUEUE_KEY);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];

      // Add new item
      queue.push({
        url: post.fileUrl,
        contentType,
        options: {
          title: `${post.source}_${post.id}`,
          tags: post.tags,
          source: sourceUrl,
        },
        timestamp: Date.now(),
      });

      // Save back to localStorage
      localStorage.setItem(EXTERNAL_QUEUE_KEY, JSON.stringify(queue));

      // Also dispatch CustomEvent for same-page updates (if Downloader tab is open)
      const event = new CustomEvent(DOWNLOADER_EVENTS.ADD_TO_QUEUE, {
        detail: {
          url: post.fileUrl,
          contentType,
          options: {
            title: `${post.source}_${post.id}`,
            tags: post.tags,
            source: sourceUrl,
          },
        },
      });
      window.dispatchEvent(event);

      console.log('[StashBrowser] Added to queue via localStorage:', post.id, post.fileUrl);
    } catch (e) {
      console.error('[StashBrowser] Failed to add to queue:', e);
    }
  }, []);

  const handleViewDetail = useCallback((post: IBooruPost) => {
    console.log('[StashBrowser] handleViewDetail called with post:', post.id);
    setDetailPost(post);
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    // Close detail modal and search for this tag
    setDetailPost(null);
    const newParams = { ...searchParams, tags: tag, page: 0 };
    handleSearch(newParams);
  }, [searchParams, handleSearch]);

  const handleToggleThumbnails = useCallback(() => {
    const newSettings = { ...settings, showThumbnails: !settings.showThumbnails };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  return (
    <div className="stash-browser container-fluid px-3 py-3">
      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* Two Column Layout */}
      <div className="row g-3">
        {/* Left Sidebar - Search Controls */}
        <div className="col-12 col-lg-3 col-xl-2">
          <div className="sidebar-wrapper">
            {/* Header */}
            <div className="sidebar-header d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <img
                  src={logoSvg}
                  alt="Stash Browser Logo"
                  style={{ width: '32px', height: '32px' }}
                />
                <div>
                  <h5 className="mb-0 text-light" style={{ fontSize: '1rem' }}>{PLUGIN_NAME}</h5>
                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>v{APP_VERSION}</small>
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                </svg>
              </button>
            </div>

            {/* Search Card */}
            <div className="search-card">
              <SearchBar
                source={searchParams.source}
                onSourceChange={handleSourceChange}
                onSearch={(tags: string, sort: SortOption, rating: RatingFilter, mediaType: MediaTypeFilter) =>
                  handleSearch({ ...searchParams, tags, page: 0, sort, rating, mediaType })
                }
                isLoading={isLoading}
                showThumbnails={settings.showThumbnails}
                onToggleThumbnails={handleToggleThumbnails}
              />
            </div>

            {/* Color Legend */}
            <div className="color-legend mt-3">
              <small className="text-muted d-block mb-2">Tag Categories</small>
              <div className="d-flex flex-column gap-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="legend-badge" style={{ backgroundColor: '#ea868f' }}>Art</span>
                  <small className="text-light">Artist</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="legend-badge" style={{ backgroundColor: '#7dcea0' }}>Char</span>
                  <small className="text-light">Character</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="legend-badge" style={{ backgroundColor: '#c39bd3' }}>Cpy</span>
                  <small className="text-light">Copyright</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="legend-badge" style={{ backgroundColor: '#f8c471' }}>Meta</span>
                  <small className="text-light">Meta</small>
                </div>
              </div>
              <small className="text-muted d-block mt-2" style={{ fontSize: '0.65rem' }}>
                Note: Rule34 doesn't provide category info. Try Gelbooru or Danbooru for categories.
              </small>
            </div>

            {/* Selection Actions */}
            {selectedIds.size > 0 && (
              <div className="selection-actions mt-3 p-2 rounded" style={{ backgroundColor: 'var(--stash-header-bg)' }}>
                <small className="text-muted d-block mb-2">{selectedIds.size} selected</small>
                <div className="d-flex flex-column gap-2">
                  <button
                    className="btn btn-sm btn-success w-100"
                    onClick={() => {
                      posts
                        .filter(p => selectedIds.has(p.id))
                        .forEach(p => handleAddToQueue(p));
                      setSelectedIds(new Set());
                    }}
                  >
                    Add to Queue
                  </button>
                  <button
                    className="btn btn-sm btn-outline-light w-100"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Area - Results Grid */}
        <div className="col-12 col-lg-9 col-xl-10">
          {/* Error */}
          {error && (
            <div className="alert alert-danger mb-3">
              {error}
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="animate-fade-in">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="skeleton-text" style={{ width: '120px', height: '1rem' }} />
              </div>
              <SkeletonGrid count={settings.resultsPerPage} />
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <small className="text-muted">
                  Showing {posts.length} of {totalCount > 0 ? `${totalCount}+` : posts.length} posts
                </small>
              </div>

              <ResultsGrid
                posts={posts}
                selectedIds={selectedIds}
                onSelectPost={handleSelectPost}
                onAddToQueue={handleAddToQueue}
                onViewDetail={handleViewDetail}
                showThumbnails={settings.showThumbnails}
              />

              {/* Infinite scroll trigger and loading indicator */}
              <div ref={loadMoreRef} className="py-4">
                {isLoadingMore ? (
                  <div className="text-center">
                    <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                      <hr className="flex-grow-1" style={{ borderColor: 'var(--stash-border)' }} />
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Loading more...</span>
                      <hr className="flex-grow-1" style={{ borderColor: 'var(--stash-border)' }} />
                    </div>
                    <SkeletonGrid count={Math.min(6, settings.resultsPerPage)} />
                  </div>
                ) : hasMore ? (
                  <div className="text-center text-muted" style={{ fontSize: '0.85rem' }}>
                    <span>Scroll for more</span>
                  </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-center gap-3">
                    <hr className="flex-grow-1" style={{ borderColor: 'var(--stash-border)' }} />
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>End of results</span>
                    <hr className="flex-grow-1" style={{ borderColor: 'var(--stash-border)' }} />
                  </div>
                )}
              </div>
            </>
          ) : hasSearched ? (
            <div className="text-center py-5">
              <p className="text-muted">No results found for "{searchParams.tags}"</p>
              <small className="text-muted">Try different tags or another source</small>
            </div>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">Enter tags to search</p>
              <small className="text-muted">
                Tip: Use spaces between tags. Prefix with - to exclude.
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={detailPost}
        onClose={() => setDetailPost(null)}
        onAddToQueue={handleAddToQueue}
        onTagClick={handleTagClick}
      />
    </div>
  );
};
