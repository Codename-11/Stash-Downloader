/**
 * PerformerSelector - Component for selecting/creating performers
 */

import React, { useState } from 'react';
import type { IStashPerformer } from '@/types';
import { useStashData } from '@/hooks';
import { debounce } from '@/utils';

interface PerformerSelectorProps {
  selectedPerformers: IStashPerformer[];
  onChange: (performers: IStashPerformer[]) => void;
  disabled?: boolean;
}

export const PerformerSelector: React.FC<PerformerSelectorProps> = ({
  selectedPerformers,
  onChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<IStashPerformer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchPerformers } = useStashData();

  const debouncedSearch = React.useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setOptions([]);
        setShowDropdown(false);
        return;
      }
      setLoading(true);
      try {
        const results = await searchPerformers(query);
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

  const handleSelect = (performer: IStashPerformer) => {
    if (!selectedPerformers.some((p) => p.id === performer.id)) {
      onChange([...selectedPerformers, performer]);
      setInputValue('');
      setShowDropdown(false);
    }
  };

  const handleRemove = (performerId: string) => {
    onChange(selectedPerformers.filter((p) => p.id !== performerId));
  };

  const handleCreateNew = () => {
    if (!inputValue.trim()) return;

    const newPerformer: IStashPerformer = {
      id: `temp-${Date.now()}`,
      name: inputValue.trim(),
    };

    onChange([...selectedPerformers, newPerformer]);
    setInputValue('');
  };

  return (
    <div className="mb-3">
      <label className="form-label">Performers</label>

      {selectedPerformers.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {selectedPerformers.map((performer) => (
            <span key={performer.id} className="badge bg-primary d-inline-flex align-items-center gap-1">
              {performer.name}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => handleRemove(performer.id)}
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
                  placeholder="Search or add performer..."
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
                      {option.disambiguation && (
                        <span className="text-secondary small ms-1">
                          ({option.disambiguation})
                        </span>
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
            Search existing performers or type a name and click "Create New"
          </small>
        </>
      )}
    </div>
  );
};
