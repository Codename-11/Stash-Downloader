/**
 * QueuePage - Main download queue page
 */

import React from 'react';
import { URLInputForm } from './URLInputForm';
import { QueueItem } from './QueueItem';
import { useDownloadQueue } from '@/hooks';
import { getScraperRegistry } from '@/services/metadata';

export const QueuePage: React.FC = () => {
  const queue = useDownloadQueue();
  const scraperRegistry = getScraperRegistry();

  const handleAddUrl = async (url: string) => {
    try {
      // Scrape metadata from URL
      const metadata = await scraperRegistry.scrape(url);
      queue.addToQueue(url, metadata);
    } catch (error) {
      console.error('Error scraping metadata:', error);
      // Add to queue anyway without metadata
      queue.addToQueue(url);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-lg-8 offset-lg-2">
          <h2 className="mb-4">Download Queue</h2>

          <URLInputForm onSubmit={handleAddUrl} />

          {/* Queue Statistics */}
          <div className="row mb-4">
            <div className="col">
              <div className="card bg-light">
                <div className="card-body py-2">
                  <div className="d-flex justify-content-around text-center">
                    <div>
                      <div className="h5 mb-0">{queue.stats.total}</div>
                      <small className="text-muted">Total</small>
                    </div>
                    <div>
                      <div className="h5 mb-0 text-primary">{queue.stats.downloading}</div>
                      <small className="text-muted">Downloading</small>
                    </div>
                    <div>
                      <div className="h5 mb-0 text-success">{queue.stats.complete}</div>
                      <small className="text-muted">Complete</small>
                    </div>
                    <div>
                      <div className="h5 mb-0 text-danger">{queue.stats.failed}</div>
                      <small className="text-muted">Failed</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {queue.items.length > 0 && (
            <div className="mb-3">
              <button
                className="btn btn-sm btn-outline-secondary me-2"
                onClick={queue.clearCompleted}
                disabled={queue.stats.complete === 0}
              >
                Clear Completed
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={queue.clearAll}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Queue Items */}
          {queue.items.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p className="h5">No downloads in queue</p>
              <p>Enter a URL above to get started</p>
            </div>
          ) : (
            <div>
              {queue.items.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  onRemove={queue.removeFromQueue}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
