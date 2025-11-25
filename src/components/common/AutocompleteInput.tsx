/**
 * AutocompleteInput - Generic autocomplete component
 * Bootstrap-based implementation
 */

import React, { useState, useEffect, useRef } from 'react';
import { debounce } from '@/utils';

interface AutocompleteInputProps<T> {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  onSearch: (query: string) => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  minChars?: number;
}

export function AutocompleteInput<T>({
  value,
  onChange,
  onSelect,
  onSearch,
  renderItem,
  placeholder,
  disabled = false,
  minChars = 2,
}: AutocompleteInputProps<T>) {
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (query.length < minChars) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await onSearch(query);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (inputValue.length >= minChars) {
      debouncedSearch(inputValue);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [inputValue, debouncedSearch, minChars]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectItem = (item: T) => {
    onSelect(item);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="position-relative flex-grow-1">
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
        />
        {isLoading && (
          <span className="input-group-text">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </span>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul
          className="list-group position-absolute w-100 shadow"
          style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}
        >
          {suggestions.map((item, index) => (
            <li
              key={(item as any).id || index}
              className="list-group-item list-group-item-action cursor-pointer"
              onClick={() => handleSelectItem(item)}
              style={{ cursor: 'pointer' }}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
