/**
 * EditWorkflowPage - Page for editing metadata before import
 */

import React, { useState } from 'react';
import type { IDownloadItem } from '@/types';
import { DownloadStatus } from '@/types';
import { MetadataEditorForm } from './MetadataEditorForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentItem = items[currentIndex];

  const handleSave = async (editedMetadata: IDownloadItem['editedMetadata']) => {
    if (!currentItem) return;

    setIsImporting(true);
    setError(null);

    try {
      const importService = getStashImportService();

      // Update item with edited metadata
      const itemWithMetadata = {
        ...currentItem,
        editedMetadata,
        status: DownloadStatus.Processing,
      };

      // Import to Stash
      const result = await importService.importToStash(itemWithMetadata);

      // Mark as complete
      onComplete(currentItem.id, result.id);

      // Move to next item
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All done
        onBack();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import to Stash';
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
      <div className="container-fluid py-4">
        <div className="alert alert-info">No items to edit</div>
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Queue
        </button>
      </div>
    );
  }

  if (isImporting) {
    return (
      <div className="container-fluid py-4">
        <LoadingSpinner size="lg" text="Importing to Stash..." />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-lg-8 offset-lg-2">
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4>Edit & Import</h4>
              <span className="badge bg-primary">
                {currentIndex + 1} / {items.length}
              </span>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-3">
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={onBack}
            >
              ← Back to Queue
            </button>
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button className="btn btn-sm btn-outline-warning" onClick={handleSkip}>
              Skip This Item →
            </button>
          </div>

          {/* Error display */}
          {error && (
            <ErrorMessage
              error={error}
              onRetry={() => setError(null)}
              onDismiss={() => setError(null)}
            />
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
