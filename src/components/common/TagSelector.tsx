/**
 * TagSelector - Component for selecting/creating tags
 */

import React, { useState } from 'react';
import { Autocomplete, TextField, Chip, Stack, Button, Box, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { IStashTag } from '@/types';
import { useStashData } from '@/hooks';
import { debounce } from '@/utils';

interface TagSelectorProps {
  selectedTags: IStashTag[];
  onChange: (tags: IStashTag[]) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<IStashTag[]>([]);
  const [loading, setLoading] = useState(false);
  const { searchTags } = useStashData();

  const debouncedSearch = React.useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchTags(query);
        setOptions(results);
      } catch (error) {
        console.error('Search error:', error);
        setOptions([]);
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
    }
  }, [inputValue, debouncedSearch]);

  const handleSelect = (tag: IStashTag | null) => {
    if (tag && !selectedTags.some((t) => t.id === tag.id)) {
      onChange([...selectedTags, tag]);
      setInputValue('');
    }
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleCreateNew = () => {
    if (!inputValue.trim()) return;

    const newTag: IStashTag = {
      id: `temp-${Date.now()}`,
      name: inputValue.trim(),
    };

    onChange([...selectedTags, newTag]);
    setInputValue('');
  };

  return (
    <Box>
      <Typography variant="body2" gutterBottom>
        Tags
      </Typography>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {selectedTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              onDelete={disabled ? undefined : () => handleRemove(tag.id)}
              color="info"
              size="small"
            />
          ))}
        </Stack>
      )}

      {/* Autocomplete input */}
      {!disabled && (
        <Stack direction="row" spacing={1}>
          <Autocomplete<IStashTag, false, false, true>
            freeSolo
            options={options}
            loading={loading}
            inputValue={inputValue}
            onInputChange={(_, newValue) => setInputValue(newValue)}
            onChange={(_, newValue) => {
              if (newValue && typeof newValue !== 'string') {
                handleSelect(newValue);
              }
            }}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return option.name;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body2" component="strong">
                    {option.name}
                  </Typography>
                  {option.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {option.description}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search or add tag..."
                variant="outlined"
                size="small"
              />
            )}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            disabled={!inputValue.trim()}
          >
            Create New
          </Button>
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Search existing tags or type a name and click "Create New"
      </Typography>
    </Box>
  );
};
