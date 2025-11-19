/**
 * useDownloadQueue - Hook for managing download queue
 */

import { useState, useCallback } from 'react';
import type { IDownloadItem, IScrapedMetadata } from '@/types';
import { DownloadStatus } from '@/types';
import { generateId } from '@/utils';

export function useDownloadQueue() {
  const [items, setItems] = useState<IDownloadItem[]>([]);

  const addToQueue = useCallback((url: string, metadata?: IScrapedMetadata) => {
    const newItem: IDownloadItem = {
      id: generateId(),
      url,
      status: DownloadStatus.Pending,
      metadata,
      addedAt: new Date(),
    };

    setItems((prev) => [...prev, newItem]);
    return newItem.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<IDownloadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) =>
      prev.filter((item) => item.status !== DownloadStatus.Complete)
    );
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  // Statistics
  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === DownloadStatus.Pending).length,
    downloading: items.filter((i) => i.status === DownloadStatus.Downloading).length,
    processing: items.filter((i) => i.status === DownloadStatus.Processing).length,
    complete: items.filter((i) => i.status === DownloadStatus.Complete).length,
    failed: items.filter((i) => i.status === DownloadStatus.Failed).length,
  };

  return {
    items,
    addToQueue,
    removeFromQueue,
    updateItem,
    clearCompleted,
    clearAll,
    stats,
  };
}
