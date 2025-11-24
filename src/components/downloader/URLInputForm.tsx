/**
 * URLInputForm - Component for entering URLs to download
 */

import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Stack } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { isValidUrl } from '@/utils';

interface URLInputFormProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
  initialValue?: string;
  onValueChange?: (value: string) => void;
}

export const URLInputForm: React.FC<URLInputFormProps> = ({
  onSubmit,
  disabled = false,
  initialValue = '',
  onValueChange,
}) => {
  const [url, setUrl] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  // Update URL when initialValue changes (e.g., from clipboard)
  useEffect(() => {
    if (initialValue && initialValue !== url) {
      setUrl(initialValue);
      if (onValueChange) {
        onValueChange(initialValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    onSubmit(url);
    setUrl('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
      <Stack spacing={2}>
        <TextField
          id="url-input"
          label="Download URL"
          type="text"
          placeholder="https://example.com/video.mp4"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
            if (onValueChange) {
              onValueChange(e.target.value);
            }
          }}
          disabled={disabled}
          error={!!error}
          helperText={error || 'Enter a direct URL to a video or image file, or a URL from a supported site'}
          fullWidth
          variant="outlined"
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<AddIcon />}
          disabled={disabled || !url.trim()}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add to Queue
        </Button>
      </Stack>
    </Box>
  );
};
