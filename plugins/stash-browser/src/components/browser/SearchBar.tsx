/**
 * Search Bar Component
 */

import React, { useState, useCallback, type FormEvent } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { SOURCES, type SourceType } from '@/constants';
import { TagAutocomplete } from './TagAutocomplete';

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
  const [tags, setTags] = useState('');

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    if (tags.trim()) {
      onSearch(tags.trim());
    }
  }, [tags, onSearch]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3 align-items-end">
        {/* Source Selector */}
        <div className="col-auto">
          <label className="form-label small text-muted">Source</label>
          <select
            className="form-select text-light"
            style={{
              backgroundColor: stashColors.inputBg,
              borderColor: stashColors.border,
            }}
            value={source}
            onChange={(e) => onSourceChange(e.target.value as SourceType)}
          >
            <option value={SOURCES.RULE34}>Rule34</option>
            <option value={SOURCES.GELBOORU}>Gelbooru</option>
            <option value={SOURCES.DANBOORU}>Danbooru</option>
          </select>
        </div>

        {/* Tags Input with Autocomplete */}
        <div className="col">
          <label className="form-label small text-muted">Tags</label>
          <TagAutocomplete
            source={source}
            value={tags}
            onChange={setTags}
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="Enter tags (space separated)"
          />
        </div>

        {/* Search Button */}
        <div className="col-auto">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !tags.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>

      {/* Tag hints */}
      <div className="mt-2">
        <small className="text-muted">
          Examples: <code>1girl solo</code> | <code>blue_hair -male</code> | <code>rating:safe</code>
        </small>
      </div>
    </form>
  );
};
