/**
 * StudioSelector - Component for selecting/creating studio
 */

import React, { useState } from 'react';
import type { IStashStudio } from '@/types';
import { useStashData } from '@/hooks';
import { debounce } from '@/utils';

interface StudioSelectorProps {
  selectedStudio: IStashStudio | null;
  onChange: (studio: IStashStudio | null) => void;
  disabled?: boolean;
}

export const StudioSelector: React.FC<StudioSelectorProps> = ({
  selectedStudio,
  onChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<IStashStudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchStudio } = useStashData();

  const debouncedSearch = React.useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setOptions([]);
        setShowDropdown(false);
        return;
      }
      setLoading(true);
      try {
        const studio = await searchStudio(query);
        setOptions(studio ? [studio] : []);
        setShowDropdown(!!studio);
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

  const handleSelect = (studio: IStashStudio) => {
    onChange(studio);
    setInputValue('');
    setShowDropdown(false);
  };

  const handleRemove = () => {
    onChange(null);
  };

  const handleCreateNew = () => {
    if (!inputValue.trim()) return;

    const newStudio: IStashStudio = {
      id: `temp-${Date.now()}`,
      name: inputValue.trim(),
    };

    onChange(newStudio);
    setInputValue('');
  };

  return (
    <div className="mb-3">
      <label className="form-label">Studio</label>

      {selectedStudio && (
        <div className="d-flex gap-1 mb-2">
          <span className="badge bg-secondary d-inline-flex align-items-center gap-1">
            {selectedStudio.name}
            {!disabled && (
              <button
                type="button"
                className="btn-close btn-close-white"
                style={{ fontSize: '0.6rem' }}
                onClick={handleRemove}
                aria-label="Remove"
              />
            )}
          </span>
        </div>
      )}

      {!disabled && !selectedStudio && (
        <>
          <div className="d-flex gap-2 position-relative">
            <div className="flex-grow-1 position-relative">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search or add studio..."
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
                      {option.url && (
                        <div className="text-secondary small">{option.url}</div>
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
            Search existing studio or type a name and click "Create New"
          </small>
        </>
      )}
    </div>
  );
};
