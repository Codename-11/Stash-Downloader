/**
 * Stash Browser - Main Component
 */

import React, { useState, useCallback, useEffect } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { PLUGIN_NAME, APP_VERSION, DOWNLOADER_EVENTS, type SourceType } from '@/constants';
import type { IBooruPost, ISearchParams } from '@/types';
import { searchPosts, getPostUrl } from '@/services/BooruService';
import { SearchBar } from './SearchBar';
import { ResultsGrid } from './ResultsGrid';
import { Pagination } from './Pagination';
import { SettingsPanel } from './SettingsPanel';
import { loadSettings, type BrowserSettings } from '@/utils';
import { PostDetailModal } from './PostDetailModal';
import { SkeletonGrid } from './SkeletonGrid';

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
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Detail modal state
  const [detailPost, setDetailPost] = useState<IBooruPost | null>(null);

  const handleSearch = useCallback(async (params: ISearchParams) => {
    setSearchParams(params);
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    // Apply safe mode if enabled
    let searchTags = params.tags;
    if (settings.safeMode && !searchTags.includes('rating:')) {
      searchTags = `${searchTags} rating:safe`.trim();
    }

    try {
      console.log('[StashBrowser] Searching:', { ...params, tags: searchTags });

      const result = await searchPosts(
        params.source,
        searchTags,
        params.page,
        params.limit
      );

      console.log('[StashBrowser] Got results:', result.count, 'posts');
      setPosts(result.posts);
      setTotalCount(result.count);
    } catch (err) {
      console.error('[StashBrowser] Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setPosts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [settings.safeMode]);

  const handleSourceChange = useCallback((source: SourceType) => {
    const newParams = { ...searchParams, source, page: 0 };
    setSearchParams(newParams);
  }, [searchParams]);

  const handlePageChange = useCallback((page: number) => {
    const newParams = { ...searchParams, page };
    handleSearch(newParams);
  }, [searchParams, handleSearch]);

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

    // Dispatch event for Stash Downloader to pick up
    // Uses same event format as browser extension for compatibility
    const event = new CustomEvent(DOWNLOADER_EVENTS.ADD_TO_QUEUE, {
      detail: {
        url: post.fileUrl,
        contentType: post.fileType === 'video' ? 'Video' : 'Image',
        options: {
          title: `${post.source}_${post.id}`,
          tags: post.tags,
          source: sourceUrl,
        },
      },
    });
    window.dispatchEvent(event);
    console.log('[StashBrowser] Added to queue:', post.id, post.fileUrl);
  }, []);

  const handleViewDetail = useCallback((post: IBooruPost) => {
    setDetailPost(post);
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    // Close detail modal and search for this tag
    setDetailPost(null);
    const newParams = { ...searchParams, tags: tag, page: 0 };
    handleSearch(newParams);
  }, [searchParams, handleSearch]);

  const totalPages = Math.ceil(totalCount / searchParams.limit);

  return (
    <div className="stash-browser container-fluid px-4 py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 text-light">{PLUGIN_NAME}</h4>
          <small className="text-muted">v{APP_VERSION}</small>
        </div>
        <div className="d-flex align-items-center gap-3">
          {selectedIds.size > 0 && (
            <div className="d-flex gap-2">
              <span className="text-muted">{selectedIds.size} selected</span>
              <button
                className="btn btn-sm btn-success"
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
                className="btn btn-sm btn-outline-light"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}
          {/* Settings Button */}
          <button
            className="btn btn-outline-secondary"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* Search Bar */}
      <div
        className="card mb-4"
        style={{ backgroundColor: stashColors.cardBg }}
      >
        <div className="card-body">
          <SearchBar
            source={searchParams.source}
            onSourceChange={handleSourceChange}
            onSearch={(tags) => handleSearch({ ...searchParams, tags, page: 0 })}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger mb-4">
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
              Found {totalCount > 0 ? `${totalCount}+` : posts.length} posts
            </small>
          </div>

          <ResultsGrid
            posts={posts}
            selectedIds={selectedIds}
            onSelectPost={handleSelectPost}
            onAddToQueue={handleAddToQueue}
            onViewDetail={handleViewDetail}
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={searchParams.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
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
