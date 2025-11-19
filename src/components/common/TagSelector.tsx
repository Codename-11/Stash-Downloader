/**
 * TagSelector - Component for selecting/creating tags
 */

import React, { useState } from 'react';
import type { IStashTag } from '@/types';
import { useStashData } from '@/hooks';
import { AutocompleteInput } from './AutocompleteInput';

interface TagSelectorProps {
  selectedTags: IStashTag[];
  onChange: (tags: IStashTag[]) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const { searchTags } = useStashData();

  const handleSelect = (tag: IStashTag) => {
    if (!selectedTags.some((t) => t.id === tag.id)) {
      onChange([...selectedTags, tag]);
    }
    setInputValue('');
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleCreateNew = () => {
    if (!inputValue.trim()) return;

    const newTag: IStashTag = {
      id: `temp-${Date.now()}`,
      name: inputValue.trim(),
    };

    onChange([...selectedTags, newTag]);
    setInputValue('');
  };

  return (
    <div>
      <label className="form-label">Tags</label>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="mb-2">
          {selectedTags.map((tag) => (
            <span key={tag.id} className="badge bg-info me-2 mb-2">
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => handleRemove(tag.id)}
                  aria-label="Remove"
                />
              )}
            </span>
          ))}
        </div>
      )}

      {/* Autocomplete input */}
      {!disabled && (
        <div className="input-group">
          <AutocompleteInput<IStashTag>
            value={inputValue}
            onChange={setInputValue}
            onSelect={handleSelect}
            onSearch={searchTags}
            renderItem={(tag) => (
              <div>
                <strong>{tag.name}</strong>
                {tag.description && (
                  <div>
                    <small className="text-muted">{tag.description}</small>
                  </div>
                )}
              </div>
            )}
            placeholder="Search or add tag..."
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleCreateNew}
            disabled={!inputValue.trim()}
          >
            Create New
          </button>
        </div>
      )}
      <small className="text-muted">
        Search existing tags or type a name and click "Create New"
      </small>
    </div>
  );
};
