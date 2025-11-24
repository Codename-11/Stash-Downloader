/**
 * PerformerSelector - Component for selecting/creating performers
 */

import React, { useState } from 'react';
import { Autocomplete, TextField, Chip, Stack, Button, Box, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
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
  const { searchPerformers } = useStashData();

  const debouncedSearch = React.useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchPerformers(query);
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

  const handleSelect = (performer: IStashPerformer | null) => {
    if (performer && !selectedPerformers.some((p) => p.id === performer.id)) {
      onChange([...selectedPerformers, performer]);
      setInputValue('');
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

  return (
    <Box>
      <Typography variant="body2" gutterBottom>
        Performers
      </Typography>

      {/* Selected performers */}
      {selectedPerformers.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {selectedPerformers.map((performer) => (
            <Chip
              key={performer.id}
              label={performer.name}
              onDelete={disabled ? undefined : () => handleRemove(performer.id)}
              color="primary"
              size="small"
            />
          ))}
        </Stack>
      )}

      {/* Autocomplete input */}
      {!disabled && (
        <Stack direction="row" spacing={1}>
          <Autocomplete<IStashPerformer, false, false, true>
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
                  {option.disambiguation && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({option.disambiguation})
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search or add performer..."
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
        Search existing performers or type a name and click "Create New"
      </Typography>
    </Box>
  );
};
