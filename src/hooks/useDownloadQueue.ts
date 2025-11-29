/**
 * useDownloadQueue - Hook for managing download queue with localStorage persistence
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { IDownloadItem, IScrapedMetadata } from '@/types';
import { DownloadStatus } from '@/types';
import { generateId } from '@/utils';
import { STORAGE_KEYS } from '@/constants';

/**
 * Serializes queue items for localStorage storage.
 * Converts Date objects to ISO strings.
 */
function serializeQueue(items: IDownloadItem[]): string {
  return JSON.stringify(items, (_key, value) => {
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

/**
 * Deserializes queue items from localStorage.
 * Converts ISO strings back to Date objects.
 */
function deserializeQueue(json: string): IDownloadItem[] {
  try {
    return JSON.parse(json, (_key, value) => {
      // Convert Date markers back to Date objects
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  } catch (e) {
    console.error('[useDownloadQueue] Failed to deserialize queue:', e);
    return [];
  }
}

/**
 * Load queue from localStorage
 */
function loadQueue(): IDownloadItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!stored) return [];

    const items = deserializeQueue(stored);

    // Reset any "downloading" items to "pending" (download was interrupted)
    return items.map(item => {
      if (item.status === DownloadStatus.Downloading || item.status === DownloadStatus.Processing) {
        return { ...item, status: DownloadStatus.Pending, progress: undefined };
      }
      return item;
    });
  } catch (e) {
    console.error('[useDownloadQueue] Failed to load queue from localStorage:', e);
    return [];
  }
}

export function useDownloadQueue() {
  // Initialize from localStorage
  const [items, setItems] = useState<IDownloadItem[]>(() => loadQueue());

  // Track if this is the initial load to avoid duplicate saves
  const isInitialLoad = useRef(true);

  /**
   * Check if a URL is already in the queue
   */
  const isUrlInQueue = useCallback((url: string): boolean => {
    return items.some((item) => item.url === url);
  }, [items]);

  /**
   * Find an existing item by URL
   */
  const findByUrl = useCallback((url: string): IDownloadItem | undefined => {
    return items.find((item) => item.url === url);
  }, [items]);

  /**
   * Add a URL to the queue
   * Returns the item ID if added, null if duplicate
   */
  const addToQueue = useCallback((url: string, metadata?: IScrapedMetadata): string | null => {
    // Check for duplicate URL in queue
    const existing = items.find((item) => item.url === url);
    if (existing) {
      console.log('[DownloadQueue] Duplicate URL detected:', url, '(existing ID:', existing.id, ')');
      return null; // Indicate duplicate
    }

    const newItem: IDownloadItem = {
      id: generateId(),
      url,
      status: DownloadStatus.Pending,
      metadata,
      addedAt: new Date(),
    };

    setItems((prev) => [...prev, newItem]);
    return newItem.id;
  }, [items]);

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

  // Persist to localStorage when items change
  useEffect(() => {
    // Skip the initial load to avoid overwriting with the same data
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.QUEUE, serializeQueue(items));
    } catch (e) {
      console.error('[useDownloadQueue] Failed to save queue to localStorage:', e);
    }
  }, [items]);

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
    isUrlInQueue,
    findByUrl,
    stats,
  };
}
