/**
 * Tag Autocomplete Component
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { stashColors } from '@stash-plugins/shared';
import { autocompleteTags, type TagSuggestion } from '@/services/BooruService';
import type { SourceType } from '@/constants';

interface TagAutocompleteProps {
  source: SourceType;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

// Tag category colors (booru convention)
const CATEGORY_COLORS: Record<number, string> = {
  0: '#0075f8', // General (blue)
  1: '#e00',    // Artist (red)
  3: '#a0a',    // Copyright/Series (purple)
  4: '#0a0',    // Character (green)
  5: '#f80',    // Meta (orange)
};

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  source,
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Enter tags (space separated)',
}) => {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Get the current word being typed (last word after space)
  const getCurrentWord = useCallback(() => {
    const words = value.split(' ');
    return words[words.length - 1] || '';
  }, [value]);

  // Fetch suggestions when typing
  useEffect(() => {
    const currentWord = getCurrentWord();

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if word is too short
    if (currentWord.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Debounce API calls
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await autocompleteTags(source, currentWord, 10);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, source, getCurrentWord]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Insert selected tag
  const insertTag = useCallback((tagName: string) => {
    const words = value.split(' ');
    words[words.length - 1] = tagName;
    const newValue = words.join(' ') + ' ';
    onChange(newValue);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  }, [value, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          insertTag(suggestions[selectedIndex].name);
        } else {
          onSubmit();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          insertTag(suggestions[selectedIndex].name);
        }
        break;
    }
  }, [isOpen, suggestions, selectedIndex, insertTag, onSubmit]);

  return (
    <div ref={containerRef} className="position-relative">
      <input
        ref={inputRef}
        type="text"
        className="form-control text-light"
        style={{
          backgroundColor: stashColors.inputBg,
          borderColor: stashColors.border,
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        disabled={disabled}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div
          className="position-absolute"
          style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }}
        >
          <span className="spinner-border spinner-border-sm text-muted" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className="position-absolute w-100 mt-1 rounded shadow-lg"
          style={{
            backgroundColor: stashColors.cardBg,
            border: `1px solid ${stashColors.border}`,
            zIndex: 1000,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((tag, index) => (
            <div
              key={tag.name}
              className="px-3 py-2 d-flex justify-content-between align-items-center"
              style={{
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? stashColors.headerBg : 'transparent',
              }}
              onClick={() => insertTag(tag.name)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span
                style={{
                  color: CATEGORY_COLORS[tag.category] || '#fff',
                }}
              >
                {tag.name.replace(/_/g, ' ')}
              </span>
              <small className="text-muted">
                {formatCount(tag.count)}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
