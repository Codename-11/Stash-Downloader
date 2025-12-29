/**
 * Search Bar Component
 *
 * Modern search bar with multi-select tag input, source selector,
 * sort options, and rating filters.
 */

import React, { useState, useCallback, type FormEvent } from 'react';
import { SOURCES, type SourceType } from '@/constants';
import { AutocompleteInput } from '@/components/common';
import type { SortOption, RatingFilter, MediaTypeFilter } from '@/types';

interface SearchBarProps {
  source: SourceType;
  onSourceChange: (source: SourceType) => void;
  onSearch: (tags: string, sort: SortOption, rating: RatingFilter, mediaType: MediaTypeFilter) => void;
  isLoading: boolean;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'score', label: 'Popular', icon: '🔥' },
  { value: 'id', label: 'Newest', icon: '🆕' },
  { value: 'updated', label: 'Updated', icon: '🔄' },
];

const RATING_OPTIONS: { value: RatingFilter; label: string; short: string; color: string }[] = [
  { value: 'all', label: 'All', short: 'All', color: 'secondary' },
  { value: 'safe', label: 'Safe', short: 'S', color: 'success' },
  { value: 'questionable', label: 'Questionable', short: 'Q', color: 'warning' },
  { value: 'explicit', label: 'Explicit', short: 'E', color: 'danger' },
];

const MEDIA_TYPE_OPTIONS: { value: MediaTypeFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Both', icon: '🎬' },
  { value: 'image', label: 'Images', icon: '🖼️' },
  { value: 'video', label: 'Videos', icon: '▶️' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  source,
  onSourceChange,
  onSearch,
  isLoading,
  showThumbnails,
  onToggleThumbnails,
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('score');
  const [rating, setRating] = useState<RatingFilter>('all');
  const [mediaType, setMediaType] = useState<MediaTypeFilter>('all');

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    if (tags.length > 0) {
      onSearch(tags.join(' '), sort, rating, mediaType);
    }
  }, [tags, sort, rating, mediaType, onSearch]);

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      {/* Source Selector */}
      <div className="mb-2">
        <select
          className="form-select form-select-sm"
          value={source}
          onChange={(e) => onSourceChange(e.target.value as SourceType)}
          disabled={isLoading}
        >
          <option value={SOURCES.RULE34}>Rule34</option>
          <option value={SOURCES.GELBOORU}>Gelbooru</option>
          <option value={SOURCES.DANBOORU}>Danbooru</option>
          <option value={SOURCES.AIBOORU}>AIBooru</option>
        </select>
      </div>

      {/* Tags Input with Autocomplete */}
      <div className="mb-2">
        <AutocompleteInput
          source={source}
          value={tags}
          onChange={setTags}
          onSubmit={handleSubmit}
          disabled={isLoading}
          placeholder="Type tags..."
        />
      </div>

      {/* Search Button */}
      <button
        type="submit"
        className="btn btn-primary w-100 mb-3"
        disabled={isLoading || tags.length === 0}
      >
        {isLoading ? (
          <span className="spinner-border spinner-border-sm" role="status" />
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            Search
          </>
        )}
      </button>

      {/* Filter section */}
      <div className="search-filters">
        {/* Sort */}
        <div className="mb-3">
          <small className="filter-label d-block mb-1">Sort By</small>
          <div className="d-flex flex-column gap-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-2 ${sort === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSort(opt.value)}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="mb-3">
          <small className="filter-label d-block mb-1">Rating</small>
          <div className="d-flex flex-column gap-1">
            {RATING_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-2 rating-btn ${rating === opt.value ? 'active' : ''} rating-btn-${opt.value}`}
                onClick={() => setRating(opt.value)}
              >
                <span className="rating-indicator" style={{ backgroundColor: rating === opt.value ? `var(--rating-${opt.value}-bg)` : 'transparent' }}></span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Media Type */}
        <div className="mb-3">
          <small className="filter-label d-block mb-1">Media Type</small>
          <div className="d-flex flex-column gap-1">
            {MEDIA_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-2 ${mediaType === opt.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setMediaType(opt.value)}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnails toggle */}
        <button
          type="button"
          className={`btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 ${showThumbnails ? 'btn-outline-success' : 'btn-outline-secondary'}`}
          onClick={onToggleThumbnails}
        >
          {showThumbnails ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
              </svg>
              <span>Thumbnails</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
              </svg>
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>

      {/* Help text */}
      <div className="mt-2">
        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
          Press <kbd>Enter</kbd> or <kbd>Space</kbd> to add tags
        </small>
      </div>
    </form>
  );
};
