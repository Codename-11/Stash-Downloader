/**
 * TagSelector - Component for selecting/creating tags
 */

import React, { useState } from 'react';
import type { IStashTag } from '@/types';
import { useStashData } from '@/hooks';
import { debounce } from '@/utils';

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
  const [options, setOptions] = useState<IStashTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchTags } = useStashData();

  const debouncedSearch = React.useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setOptions([]);
        setShowDropdown(false);
        return;
      }
      setLoading(true);
      try {
        const results = await searchTags(query);
        setOptions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setOptions([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  React.useEffect(() => {
    if (inputValue) {
      debouncedSearch(inputValue);
    } else {
      setOptions([]);
      setShowDropdown(false);
    }
  }, [inputValue, debouncedSearch]);

  const handleSelect = (tag: IStashTag) => {
    if (!selectedTags.some((t) => t.id === tag.id)) {
      onChange([...selectedTags, tag]);
      setInputValue('');
      setShowDropdown(false);
    }
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
    <div className="mb-3">
      <label className="form-label">Tags</label>

      {selectedTags.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tag) => (
            <span key={tag.id} className="badge bg-info d-inline-flex align-items-center gap-1">
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => handleRemove(tag.id)}
                  aria-label="Remove"
                />
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <>
          <div className="d-flex gap-2 position-relative">
            <div className="flex-grow-1 position-relative">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search or add tag..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => options.length > 0 && setShowDropdown(true)}
                />
                {loading && (
                  <span className="input-group-text">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </span>
                )}
              </div>

              {showDropdown && options.length > 0 && (
                <ul
                  className="list-group position-absolute w-100 shadow"
                  style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}
                >
                  {options.map((option) => (
                    <li
                      key={option.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => handleSelect(option)}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong>{option.name}</strong>
                      {option.description && (
                        <div className="text-secondary small">{option.description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleCreateNew}
              disabled={!inputValue.trim()}
            >
              ➕ Create New
            </button>
          </div>
          <small className="form-text text-secondary d-block mt-1">
            Search existing tags or type a name and click "Create New"
          </small>
        </>
      )}
    </div>
  );
};
