/**
 * EditWorkflowPage - Page for editing metadata before import
 */

import React, { useState } from 'react';
import type { IDownloadItem } from '@/types';
import { DownloadStatus } from '@/types';
import { MetadataEditorForm } from './MetadataEditorForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useToast } from '@/contexts/ToastContext';
import { useLog } from '@/contexts/LogContext';
import { getStashImportService } from '@/services/stash';
import { formatDownloadError } from '@/utils/helpers';
import { createLogger } from '@/utils';

const debugLog = createLogger('EditWorkflow');

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
      const errorStack = err instanceof Error ? err.stack : undefined;
      const formattedError = formatDownloadError(err, currentItem.url);
      
      // Log detailed error information
      debugLog.error('Import error details: ' + JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        formattedError,
        itemUrl: currentItem.url,
        itemTitle: itemTitle,
        hasMetadata: !!currentItem.metadata,
        videoUrl: currentItem.metadata?.videoUrl,
      }));
      
      log.addLog('error', 'download', `Failed to import to Stash: ${formattedError}`, 
        `URL: ${currentItem.url}\nVideo URL: ${currentItem.metadata?.videoUrl || 'none'}\n${errorStack || ''}`
      );
      toast.showToast('error', 'Import Failed', formattedError);
      setError(formattedError);
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
      <div className="d-flex flex-column min-vh-100">
        <nav className="navbar navbar-light bg-light border-bottom">
          <div className="container-fluid">
            <h6 className="mb-0 flex-grow-1">Edit & Import</h6>
          </div>
        </nav>
        <div className="container-lg py-4">
          <div className="alert alert-info mb-3">
            No items to edit
          </div>
          <button className="btn btn-outline-secondary" onClick={onBack}>
            ← Back to Queue
          </button>
        </div>
      </div>
    );
  }

  if (isImporting) {
    return (
      <div className="d-flex flex-column min-vh-100">
        <nav className="navbar navbar-light bg-light border-bottom">
          <div className="container-fluid">
            <h6 className="mb-0 flex-grow-1">Edit & Import</h6>
          </div>
        </nav>
        <div className="container-lg py-4">
          <LoadingSpinner size="lg" text="Importing to Stash..." />
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / items.length) * 100;

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-light bg-light border-bottom">
        <div className="container-fluid">
          <h6 className="mb-0 flex-grow-1">Edit & Import</h6>
        </div>
      </nav>
      <div className="container-fluid py-4 px-3">
        <div className="d-flex flex-column gap-3">
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Edit & Import</h5>
              <span className="badge bg-primary">{currentIndex + 1} / {items.length}</span>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${progressPercentage}%` }}
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
          </div>

          {/* Navigation */}
          <div className="d-flex gap-2 mb-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={onBack}
            >
              ← Back to Queue
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button
              className="btn btn-outline-warning btn-sm"
              onClick={handleSkip}
            >
              Skip This Item →
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-3">
              <ErrorMessage
                error={error}
                onRetry={() => setError(null)}
                onDismiss={() => setError(null)}
              />
            </div>
          )}

          {/* Metadata editor */}
          <MetadataEditorForm
            item={currentItem}
            onSave={handleSave}
            onCancel={handleSkip}
          />
        </div>
      </div>
    </div>
  );
};
