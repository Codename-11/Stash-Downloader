/**
 * Search Bar Component
 *
 * Modern search bar with multi-select tag input and source selector.
 */

import React, { useState, useCallback, type FormEvent } from 'react';
import { SOURCES, type SourceType } from '@/constants';
import { AutocompleteInput } from '@/components/common';

interface SearchBarProps {
  source: SourceType;
  onSourceChange: (source: SourceType) => void;
  onSearch: (tags: string) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  source,
  onSourceChange,
  onSearch,
  isLoading,
}) => {
  const [tags, setTags] = useState<string[]>([]);

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    if (tags.length > 0) {
      onSearch(tags.join(' '));
    }
  }, [tags, onSearch]);

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      {/* Search row */}
      <div className="d-flex gap-3 align-items-stretch">
        {/* Source Selector */}
        <div className="search-bar-source">
          <select
            className="form-select h-100"
            value={source}
            onChange={(e) => onSourceChange(e.target.value as SourceType)}
            disabled={isLoading}
          >
            <option value={SOURCES.RULE34}>Rule34</option>
            <option value={SOURCES.GELBOORU}>Gelbooru</option>
            <option value={SOURCES.DANBOORU}>Danbooru</option>
          </select>
        </div>

        {/* Tags Input with Autocomplete */}
        <div className="flex-grow-1">
          <AutocompleteInput
            source={source}
            value={tags}
            onChange={setTags}
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="Type tags and press Enter..."
          />
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="btn btn-primary search-bar-button"
          disabled={isLoading || tags.length === 0}
        >
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" role="status" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Tag hints */}
      <div className="mt-2">
        <small className="text-muted">
          Type to search tags. Press <kbd>Enter</kbd> or <kbd>Space</kbd> to add. Use <kbd>-tag</kbd> to exclude.
        </small>
      </div>
    </form>
  );
};
