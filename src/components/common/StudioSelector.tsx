/**
 * StudioSelector - Component for selecting/creating studio
 */

import React, { useState } from 'react';
import { Autocomplete, TextField, Chip, Stack, Button, Box, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { IStashStudio } from '@/types';
import { useStashData } from '@/hooks';
import { debounce } from '@/utils';

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
  const { searchStudio } = useStashData();

  const debouncedSearch = React.useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const studio = await searchStudio(query);
        setOptions(studio ? [studio] : []);
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

  const handleSelect = (studio: IStashStudio | null) => {
    if (studio) {
      onChange(studio);
      setInputValue('');
    }
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

  return (
    <Box>
      <Typography variant="body2" gutterBottom>
        Studio
      </Typography>

      {/* Selected studio */}
      {selectedStudio && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            label={selectedStudio.name}
            onDelete={disabled ? undefined : handleRemove}
            color="default"
            size="small"
          />
        </Stack>
      )}

      {/* Autocomplete input */}
      {!disabled && !selectedStudio && (
        <Stack direction="row" spacing={1}>
          <Autocomplete<IStashStudio, false, false, true>
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
                  {option.url && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {option.url}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search or add studio..."
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
        Search existing studio or type a name and click "Create New"
      </Typography>
    </Box>
  );
};
