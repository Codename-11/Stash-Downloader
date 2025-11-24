/**
 * AutocompleteInput - Generic autocomplete component
 * Note: This component is being replaced by MUI Autocomplete in selector components
 * Keeping for backward compatibility but will be deprecated
 */

import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
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

  // Debounced search
  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (query.length < minChars) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await onSearch(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
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
    }
  }, [inputValue, debouncedSearch, minChars]);

  return (
    <Autocomplete<T, false, false, true>
      freeSolo
      options={suggestions}
      loading={isLoading}
      inputValue={inputValue}
      onInputChange={(_, newValue) => {
        setInputValue(newValue);
        onChange(newValue);
      }}
      onChange={(_, newValue) => {
        if (newValue && typeof newValue !== 'string') {
          onSelect(newValue);
        }
      }}
      disabled={disabled}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        // For custom objects, try to get a display name
        return (option as any).name || String(option);
      }}
      renderOption={(props, option) => (
        <li {...props} key={(option as any).id || String(option)}>
          {renderItem(option)}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{ flexGrow: 1 }}
    />
  );
}
