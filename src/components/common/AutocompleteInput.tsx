/**
 * AutocompleteInput - Generic autocomplete component
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
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
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
      } finally {
        setIsLoading(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    onSelect(item);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="position-relative">
      <input
        type="text"
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isLoading && (
        <span className="position-absolute top-50 end-0 translate-middle-y me-2">
          <span className="spinner-border spinner-border-sm" />
        </span>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul className="list-group position-absolute w-100 mt-1" style={{ zIndex: 1000 }}>
          {suggestions.map((item, index) => (
            <li
              key={index}
              className="list-group-item list-group-item-action"
              style={{ cursor: 'pointer' }}
              onClick={() => handleSelect(item)}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
