/**
 * StudioSelector - Component for selecting/creating studio
 */

import React, { useState } from 'react';
import type { IStashStudio } from '@/types';
import { useStashData } from '@/hooks';
import { debounce, createLogger } from '@/utils';

const log = createLogger('StudioSelector');

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
        log.error('Search error:', error instanceof Error ? error.message : String(error));
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

  // Check if a studio is temporary (to be created)
  const isTemporaryStudio = (studio: IStashStudio) => studio.id.startsWith('temp-');

  return (
    <div className="mb-3">
      <label className="form-label" style={{ color: '#8b9fad', fontSize: '0.95rem' }}>Studio</label>

      {selectedStudio && (
        <div className="d-flex gap-2 mb-2">
          <span
            className="d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: isTemporaryStudio(selectedStudio) ? '#28a745' : '#6c757d',
              color: '#fff',
              padding: '0.4rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            {selectedStudio.name}
            {isTemporaryStudio(selectedStudio) && (
              <span style={{ opacity: 0.8, fontSize: '0.75rem', marginLeft: '2px' }}>(new)</span>
            )}
            {!disabled && (
              <button
                type="button"
                className="btn-close btn-close-white"
                style={{ fontSize: '0.5rem', marginLeft: '4px' }}
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
                  className="form-control text-light"
                  style={{
                    backgroundColor: '#243340',
                    borderColor: '#394b59',
                    fontSize: '0.95rem',
                    padding: '0.5rem 0.75rem',
                  }}
                  placeholder="Search or add studio..."
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
                      {option.url && (
                        <div style={{ color: '#8b9fad', fontSize: '0.8rem' }}>{option.url}</div>
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
            Search existing studio or type a name and click "Create New"
          </small>
        </>
      )}
    </div>
  );
};
