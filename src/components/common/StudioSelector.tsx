/**
 * StudioSelector - Component for selecting/creating studio
 */

import React, { useState } from 'react';
import type { IStashStudio } from '@/types';
import { useStashData } from '@/hooks';
import { AutocompleteInput } from './AutocompleteInput';

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
  const { searchStudio } = useStashData();

  const handleSelect = (studio: IStashStudio) => {
    onChange(studio);
    setInputValue('');
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

  // Custom search that returns array
  const handleSearch = async (query: string): Promise<IStashStudio[]> => {
    const studio = await searchStudio(query);
    return studio ? [studio] : [];
  };

  return (
    <div>
      <label className="form-label">Studio</label>

      {/* Selected studio */}
      {selectedStudio && (
        <div className="mb-2">
          <span className="badge bg-secondary me-2 mb-2">
            {selectedStudio.name}
            {!disabled && (
              <button
                type="button"
                className="btn-close btn-close-white ms-2"
                style={{ fontSize: '0.6rem' }}
                onClick={handleRemove}
                aria-label="Remove"
              />
            )}
          </span>
        </div>
      )}

      {/* Autocomplete input */}
      {!disabled && !selectedStudio && (
        <div className="input-group">
          <AutocompleteInput<IStashStudio>
            value={inputValue}
            onChange={setInputValue}
            onSelect={handleSelect}
            onSearch={handleSearch}
            renderItem={(studio) => (
              <div>
                <strong>{studio.name}</strong>
                {studio.url && (
                  <div>
                    <small className="text-muted">{studio.url}</small>
                  </div>
                )}
              </div>
            )}
            placeholder="Search or add studio..."
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
        Search existing studio or type a name and click "Create New"
      </small>
    </div>
  );
};
