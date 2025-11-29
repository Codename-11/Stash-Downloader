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

  // Check if a performer is temporary (to be created)
  const isTemporaryPerformer = (performer: IStashPerformer) => performer.id.startsWith('temp-');

  return (
    <div className="mb-3">
      <label className="form-label" style={{ color: '#8b9fad', fontSize: '0.95rem' }}>Performers</label>

      {selectedPerformers.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {selectedPerformers.map((performer) => (
            <span
              key={performer.id}
              className="d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: isTemporaryPerformer(performer) ? '#28a745' : '#0d6efd',
                color: '#fff',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {performer.name}
              {isTemporaryPerformer(performer) && (
                <span style={{ opacity: 0.8, fontSize: '0.75rem', marginLeft: '2px' }}>(new)</span>
              )}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.5rem', marginLeft: '4px' }}
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
                  className="form-control text-light"
                  style={{
                    backgroundColor: '#243340',
                    borderColor: '#394b59',
                    fontSize: '0.95rem',
                    padding: '0.5rem 0.75rem',
                  }}
                  placeholder="Search or add performer..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => options.length > 0 && setShowDropdown(true)}
                />
                {loading && (
                  <span
                    className="input-group-text"
                    style={{ backgroundColor: '#243340', borderColor: '#394b59' }}
                  >
                    <div className="spinner-border spinner-border-sm text-light" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </span>
                )}
              </div>

              {showDropdown && options.length > 0 && (
                <ul
                  className="list-group position-absolute w-100 shadow"
                  style={{
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: '#243340',
                    border: '1px solid #394b59',
                  }}
                >
                  {options.map((option) => (
                    <li
                      key={option.id}
                      className="list-group-item list-group-item-action"
                      onClick={() => handleSelect(option)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: '#243340',
                        color: '#fff',
                        borderColor: '#394b59',
                        padding: '0.5rem 0.75rem',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#394b59'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#243340'}
                    >
                      <strong style={{ fontSize: '0.9rem' }}>{option.name}</strong>
                      {option.disambiguation && (
                        <span style={{ color: '#8b9fad', fontSize: '0.8rem', marginLeft: '4px' }}>
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
              style={{ fontSize: '0.9rem', padding: '0.4rem 0.75rem' }}
              onClick={handleCreateNew}
              disabled={!inputValue.trim()}
            >
              ➕ Create New
            </button>
          </div>
          <small className="d-block mt-1" style={{ color: '#8b9fad', fontSize: '0.8rem' }}>
            Search existing performers or type a name and click "Create New"
          </small>
        </>
      )}
    </div>
  );
};
