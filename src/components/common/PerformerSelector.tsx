/**
 * PerformerSelector - Component for selecting/creating performers
 */

import React, { useState } from 'react';
import type { IStashPerformer } from '@/types';
import { useStashData } from '@/hooks';
import { AutocompleteInput } from './AutocompleteInput';

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
  const { searchPerformers } = useStashData();

  const handleSelect = (performer: IStashPerformer) => {
    // Don't add duplicates
    if (!selectedPerformers.some((p) => p.id === performer.id)) {
      onChange([...selectedPerformers, performer]);
    }
    setInputValue('');
  };

  const handleRemove = (performerId: string) => {
    onChange(selectedPerformers.filter((p) => p.id !== performerId));
  };

  const handleCreateNew = () => {
    if (!inputValue.trim()) return;

    // Create a temporary performer (ID will be assigned when created in Stash)
    const newPerformer: IStashPerformer = {
      id: `temp-${Date.now()}`,
      name: inputValue.trim(),
    };

    onChange([...selectedPerformers, newPerformer]);
    setInputValue('');
  };

  return (
    <div>
      <label className="form-label">Performers</label>

      {/* Selected performers */}
      {selectedPerformers.length > 0 && (
        <div className="mb-2">
          {selectedPerformers.map((performer) => (
            <span key={performer.id} className="badge bg-primary me-2 mb-2">
              {performer.name}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => handleRemove(performer.id)}
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
          <AutocompleteInput<IStashPerformer>
            value={inputValue}
            onChange={setInputValue}
            onSelect={handleSelect}
            onSearch={searchPerformers}
            renderItem={(performer) => (
              <div>
                <strong>{performer.name}</strong>
                {performer.disambiguation && (
                  <small className="text-muted"> ({performer.disambiguation})</small>
                )}
              </div>
            )}
            placeholder="Search or add performer..."
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
        Search existing performers or type a name and click "Create New"
      </small>
    </div>
  );
};
