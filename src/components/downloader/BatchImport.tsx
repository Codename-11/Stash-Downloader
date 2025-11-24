/**
 * BatchImport - Component for importing multiple URLs
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Stack,
  Box,
} from '@mui/material';
import { ContentCopy as ContentCopyIcon, Inventory as InventoryIcon } from '@mui/icons-material';
import { isValidUrl } from '@/utils';
import { useToast } from '@/contexts/ToastContext';

interface BatchImportProps {
  onImport: (urls: string[]) => void;
  onSingleUrl?: (url: string) => void; // Callback for single URL (to autofill URL field)
}

export const BatchImport: React.FC<BatchImportProps> = ({ onImport, onSingleUrl }) => {
  const [showModal, setShowModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmedText = text.trim();
      
      if (!trimmedText) {
        toast.showToast('warning', 'Clipboard Empty', 'Clipboard does not contain any text.');
        return;
      }

      // Check if it's a single URL
      const lines = trimmedText.split('\n').map((line) => line.trim()).filter(line => line);
      const validUrls = lines.filter((line) => isValidUrl(line));
      
      if (validUrls.length === 1 && lines.length === 1 && validUrls[0]) {
        // Single URL - autofill the URL field
        if (onSingleUrl) {
          onSingleUrl(validUrls[0]);
          toast.showToast('success', 'URL Copied', 'URL from clipboard has been filled in the URL field.');
        } else {
          // Fallback: open modal if callback not provided
          setTextInput(trimmedText);
          setShowModal(true);
          setError(null);
        }
      } else if (validUrls.length > 1) {
        // Multiple URLs - open batch import modal
        setTextInput(trimmedText);
        setShowModal(true);
        setError(null);
        toast.showToast('info', 'Multiple URLs Detected', `Found ${validUrls.length} URLs. Opening batch import...`);
      } else if (validUrls.length === 0) {
        // No valid URLs found
        toast.showToast('error', 'No Valid URLs', 'Clipboard does not contain any valid URLs.');
        setTextInput(trimmedText);
        setShowModal(true);
        setError('No valid URLs found in clipboard');
      } else {
        // Mixed content - open modal
        setTextInput(trimmedText);
        setShowModal(true);
        setError(null);
      }
    } catch (err) {
      const errorMsg = 'Failed to read from clipboard. Please paste manually.';
      toast.showToast('error', 'Clipboard Error', errorMsg);
      setError(errorMsg);
      setShowModal(true);
    }
  };

  const handleBatchImportClick = () => {
    setShowModal(true);
    setTextInput('');
    setError(null);
  };

  const handleImport = () => {
    const lines = textInput.split('\n').map((line) => line.trim());
    const urls = lines.filter((line) => line && isValidUrl(line));

    if (urls.length === 0) {
      setError('No valid URLs found');
      return;
    }

    onImport(urls);
    setShowModal(false);
    setTextInput('');
    setError(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setTextInput('');
    setError(null);
  };

  const getUrlCount = () => {
    const lines = textInput.split('\n').map((line) => line.trim());
    return lines.filter((line) => line && isValidUrl(line)).length;
  };

  return (
    <>
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={handleImportFromClipboard}
          title="Import single URL from clipboard (autofills URL field) or multiple URLs (opens batch import)"
        >
          Import from Clipboard
        </Button>
        <Button
          variant="outlined"
          startIcon={<InventoryIcon />}
          onClick={handleBatchImportClick}
          title="Open batch import dialog to paste multiple URLs"
        >
          Batch Import
        </Button>
      </Stack>

      <Dialog open={showModal} onClose={handleCancel} maxWidth="md" fullWidth>
        <DialogTitle>Batch Import URLs</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Paste URLs (one per line). Invalid URLs will be automatically filtered out.
            </Typography>
            <TextField
              multiline
              rows={10}
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4&#10;https://example.com/video3.mp4"
              error={!!error}
              helperText={error}
              fullWidth
              variant="outlined"
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Valid URLs found: <strong>{getUrlCount()}</strong>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={getUrlCount() === 0}
          >
            Import {getUrlCount()} URLs
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
