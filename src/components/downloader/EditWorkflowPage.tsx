/**
 * EditWorkflowPage - Page for editing metadata before import
 */

import React, { useState } from 'react';
import { Container, Box, Typography, LinearProgress, Chip, Stack, Button, Alert, AppBar, Toolbar } from '@mui/material';
import { ArrowBack as ArrowBackIcon, SkipNext as SkipNextIcon } from '@mui/icons-material';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import type { IDownloadItem } from '@/types';
import { DownloadStatus } from '@/types';
import { MetadataEditorForm } from './MetadataEditorForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getStashImportService } from '@/services/stash';

interface EditWorkflowPageProps {
  items: IDownloadItem[];
  onComplete: (itemId: string, stashId: string) => void;
  onSkip: (itemId: string) => void;
  onBack: () => void;
}

export const EditWorkflowPage: React.FC<EditWorkflowPageProps> = ({
  items,
  onComplete,
  onSkip,
  onBack,
}) => {
  const toast = useToast();
  const log = useLog();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentItem = items[currentIndex];

  const handleSave = async (editedMetadata: IDownloadItem['editedMetadata']) => {
    if (!currentItem) return;

    setIsImporting(true);
    setError(null);

    const itemTitle = currentItem.editedMetadata?.title || currentItem.metadata?.title || currentItem.url;
    
    try {
      log.addLog('info', 'download', `Starting import to Stash: ${itemTitle}`);
      
      const importService = getStashImportService();

      // Update item with edited metadata
      const itemWithMetadata = {
        ...currentItem,
        editedMetadata,
        status: DownloadStatus.Processing,
      };

      // Import to Stash
      const result = await importService.importToStash(itemWithMetadata);

      log.addLog('success', 'download', `Successfully imported to Stash: ${itemTitle}`, `Stash ID: ${result.id}`);
      toast.showToast('success', 'Import Successful', `Successfully imported: ${itemTitle}`);

      // Mark as complete
      onComplete(currentItem.id, result.id);

      // Move to next item
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All done
        log.addLog('success', 'download', 'All items imported successfully');
        toast.showToast('success', 'All Done', 'All items have been imported successfully');
        onBack();
      }
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : 'Failed to import to Stash';
      const errorStack = err instanceof Error ? err.stack : undefined;
      
      // Log detailed error information
      console.error('[EditWorkflowPage] Import error details:', {
        error: err,
        message: errorMsg,
        stack: errorStack,
        itemUrl: currentItem.url,
        itemTitle: itemTitle,
        hasMetadata: !!currentItem.metadata,
        videoUrl: currentItem.metadata?.videoUrl,
      });
      
      // Provide helpful error messages for common issues
      if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS')) {
        const corsEnabled = typeof window !== 'undefined' && localStorage.getItem('corsProxyEnabled') === 'true';
        if (!corsEnabled) {
          errorMsg = 'CORS Error: Enable CORS proxy in settings to download from this site. The site blocks direct browser requests.';
        } else {
          errorMsg = 'Network Error: Check if CORS proxy is running and accessible. Some sites may block downloads even with proxy.';
        }
      }
      
      // Add more context to error message
      if (errorMsg.includes('Invalid URL')) {
        errorMsg += ` (URL: ${currentItem.url})`;
      }
      
      log.addLog('error', 'download', `Failed to import to Stash: ${errorMsg}`, 
        `URL: ${currentItem.url}\nVideo URL: ${currentItem.metadata?.videoUrl || 'none'}\n${errorStack || ''}`
      );
      toast.showToast('error', 'Import Failed', errorMsg);
      setError(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkip = () => {
    if (!currentItem) return;

    onSkip(currentItem.id);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onBack();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setError(null);
    }
  };

  if (!currentItem) {
    return (
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Edit & Import
            </Typography>
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            No items to edit
          </Alert>
          <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
            Back to Queue
          </Button>
        </Container>
      </Box>
    );
  }

  if (isImporting) {
    return (
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Edit & Import
            </Typography>
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner size="lg" text="Importing to Stash..." />
        </Container>
      </Box>
    );
  }

  const progressPercentage = ((currentIndex + 1) / items.length) * 100;

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Edit & Import
          </Typography>
          <ThemeToggle />
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ py: 4, px: 3 }}>
        <Stack spacing={3}>
          {/* Progress indicator */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h5" component="h4">
                Edit & Import
              </Typography>
              <Chip label={`${currentIndex + 1} / ${items.length}`} color="primary" />
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          {/* Navigation */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={onBack}
            >
              Back to Queue
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              endIcon={<SkipNextIcon />}
              onClick={handleSkip}
            >
              Skip This Item
            </Button>
          </Stack>

          {/* Error display */}
          {error && (
            <Box sx={{ mb: 3 }}>
              <ErrorMessage
                error={error}
                onRetry={() => setError(null)}
                onDismiss={() => setError(null)}
              />
            </Box>
          )}

          {/* Metadata editor */}
          <MetadataEditorForm
            item={currentItem}
            onSave={handleSave}
            onCancel={handleSkip}
          />
        </Stack>
      </Container>
    </Box>
  );
};
