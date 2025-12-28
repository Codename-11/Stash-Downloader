/**
 * Stash Browser - Main Component
 */

import { useState, useCallback } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { PLUGIN_NAME, APP_VERSION, SOURCES, type SourceType } from '@/constants';
import type { IBooruPost, ISearchParams } from '@/types';
import { SearchBar } from './SearchBar';
import { ResultsGrid } from './ResultsGrid';
import { Pagination } from './Pagination';

export const BrowserMain: React.FC = () => {
  // Search state
  const [searchParams, setSearchParams] = useState<ISearchParams>({
    source: SOURCES.RULE34,
    tags: '',
    page: 0,
    limit: 40,
  });

  // Results state
  const [posts, setPosts] = useState<IBooruPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleSearch = useCallback(async (params: ISearchParams) => {
    setSearchParams(params);
    setIsLoading(true);
    setError(null);
    setPosts([]);

    try {
      // TODO: Implement actual API call via Python backend
      // For now, just show placeholder
      console.log('[StashBrowser] Search:', params);

      // Placeholder - will be replaced with actual API call
      setPosts([]);
      setTotalCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    // Dispatch event for Stash Downloader to pick up
    const event = new CustomEvent('stash-downloader:add-to-queue', {
      detail: {
        url: post.fileUrl,
        contentType: post.fileType === 'video' ? 'Video' : 'Image',
        metadata: {
          title: `${post.source}_${post.id}`,
          tags: post.tags,
          source: post.sourceUrl,
        },
      },
    });
    window.dispatchEvent(event);
    console.log('[StashBrowser] Added to queue:', post.id);
  }, []);

  const totalPages = Math.ceil(totalCount / searchParams.limit);

  return (
    <div className="container-fluid px-4 py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 text-light">{PLUGIN_NAME}</h4>
          <small className="text-muted">v{APP_VERSION}</small>
        </div>
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
      </div>

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
        <div className="text-center py-5">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-2">Searching...</p>
        </div>
      ) : posts.length > 0 ? (
        <>
          <ResultsGrid
            posts={posts}
            selectedIds={selectedIds}
            onSelectPost={handleSelectPost}
            onAddToQueue={handleAddToQueue}
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={searchParams.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : searchParams.tags ? (
        <div className="text-center py-5">
          <p className="text-muted">No results found for "{searchParams.tags}"</p>
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
  );
};
