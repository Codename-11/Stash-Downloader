/**
 * Multi-Select Autocomplete Input Component
 *
 * A tag input with autocomplete suggestions, similar to Mantine's MultiSelect.
 * Selected tags appear as removable chips.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { autocompleteTags, type TagSuggestion } from '@/services/BooruService';
import type { SourceType } from '@/constants';

interface AutocompleteInputProps {
  source: SourceType;
  value: string[];
  onChange: (tags: string[]) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

// Tag category colors and labels (booru convention)
// Category 0 (General) is excluded - only show badge for specific categories
// This is because Rule34's autocomplete doesn't return real category info
const CATEGORY_INFO: Record<number, { color: string; label: string; short: string }> = {
  1: { color: '#ea868f', label: 'Artist', short: 'Art' },
  3: { color: '#c39bd3', label: 'Copyright', short: 'Cpy' },
  4: { color: '#7dcea0', label: 'Character', short: 'Char' },
  5: { color: '#f8c471', label: 'Meta', short: 'Meta' },
};

// Default styling for General/unknown tags (no badge shown)
const DEFAULT_CATEGORY = { color: '#6ea8fe', label: '', short: '' };

// Debounce delay in ms - longer to reduce API calls
const DEBOUNCE_DELAY = 350;

// Minimum characters before searching
const MIN_SEARCH_LENGTH = 2;

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  source,
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Add tags...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<string>('');
  const requestIdRef = useRef<number>(0);

  // Clear suggestions when source changes
  useEffect(() => {
    setSuggestions([]);
    setIsOpen(false);
    lastQueryRef.current = '';
  }, [source]);

  // Fetch suggestions when typing (with proper debouncing)
  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Convert spaces to underscores for booru tag format (e.g., "violet parr" -> "violet_parr")
    const query = inputValue.trim().toLowerCase().replace(/\s+/g, '_');

    // Clear suggestions if query too short
    if (query.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      lastQueryRef.current = '';
      return;
    }

    // Skip if same query as last successful fetch
    if (query === lastQueryRef.current) {
      return;
    }

    // Show loading immediately to mask API delay
    setIsLoading(true);

    // Debounce the actual API call
    debounceRef.current = setTimeout(async () => {
      // Increment request ID to track this request
      const currentRequestId = ++requestIdRef.current;

      try {
        const results = await autocompleteTags(source, query, 100);

        // Ignore stale responses (user kept typing)
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        // Filter out already selected tags
        const filtered = results.filter(tag => !value.includes(tag.name));

        // Update state
        setSuggestions(filtered);
        setIsOpen(filtered.length > 0);
        setSelectedIndex(-1);
        lastQueryRef.current = query;
      } catch (error) {
        // Ignore errors from stale requests
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        console.error('[AutocompleteInput] Error:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        // Only clear loading if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [inputValue, source, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = useCallback((tagName: string) => {
    const cleanTag = tagName.trim().toLowerCase().replace(/\s+/g, '_');
    if (cleanTag && !value.includes(cleanTag)) {
      onChange([...value, cleanTag]);
    }
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, [value, onChange]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  }, [value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle backspace to remove last tag
    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      const lastTag = value[value.length - 1];
      if (lastTag) removeTag(lastTag);
      return;
    }

    // Handle enter to add tag or submit
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      } else if (value.length > 0) {
        onSubmit();
      }
      return;
    }

    // Handle dropdown navigation
    if (isOpen && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
          break;
        case 'Tab':
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            e.preventDefault();
            addTag(suggestions[selectedIndex].name);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    }
  }, [inputValue, value, isOpen, suggestions, selectedIndex, addTag, removeTag, onSubmit]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="autocomplete-input-wrapper position-relative">
      {/* Main container styled like an input */}
      <div
        className="autocomplete-input-container"
        onClick={handleContainerClick}
      >
        {/* Selected tags as chips */}
        {value.map((tag) => (
          <span key={tag} className="autocomplete-chip">
            <span className="autocomplete-chip-text">{tag.replace(/_/g, ' ')}</span>
            <button
              type="button"
              className="autocomplete-chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove ${tag}`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          className="autocomplete-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Loading indicator */}
        {isLoading && (
          <span className="autocomplete-loading">
            <span className="spinner-border spinner-border-sm" />
          </span>
        )}
      </div>

      {/* Suggestions dropdown */}
      {(isOpen && suggestions.length > 0) || (isLoading && inputValue.trim().length >= MIN_SEARCH_LENGTH) ? (
        <div className="autocomplete-dropdown">
          {isLoading ? (
            // Loading skeleton items
            <>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="autocomplete-item autocomplete-skeleton">
                  <span
                    className="skeleton-text"
                    style={{ width: `${40 + Math.random() * 80}px` }}
                  />
                  <span className="skeleton-text" style={{ width: '30px' }} />
                </div>
              ))}
            </>
          ) : (
            suggestions.map((tag, index) => {
              const catInfo = CATEGORY_INFO[tag.category] || DEFAULT_CATEGORY;
              return (
                <div
                  key={tag.name}
                  className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => addTag(tag.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="autocomplete-item-content">
                    {catInfo.label && (
                      <span
                        className="autocomplete-category-badge"
                        style={{ backgroundColor: catInfo.color }}
                      >
                        {catInfo.short}
                      </span>
                    )}
                    <span
                      className="autocomplete-item-name"
                      style={{ color: catInfo.color }}
                    >
                      {tag.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {tag.count > 0 && (
                    <span className="autocomplete-item-count">
                      {formatCount(tag.count)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};
