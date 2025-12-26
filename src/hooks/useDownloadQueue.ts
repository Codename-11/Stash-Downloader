/**
 * useDownloadQueue - Hook for managing download queue with localStorage persistence
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { IDownloadItem, IScrapedMetadata } from '@/types';
import { DownloadStatus } from '@/types';
import { generateId, createLogger } from '@/utils';
import { STORAGE_KEYS } from '@/constants';

const log = createLogger('DownloadQueue');

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
    log.error('Failed to deserialize queue:', e instanceof Error ? e.message : String(e));
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

    // For "downloading" items, check if they've been stuck for too long
    // If started more than 15 minutes ago, assume interrupted and reset to pending
    const MAX_DOWNLOAD_TIME_MS = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();

    return items.map(item => {
      if (item.status === DownloadStatus.Downloading || item.status === DownloadStatus.Processing) {
        const startTime = item.startedAt ? new Date(item.startedAt).getTime() : 0;
        const elapsed = now - startTime;

        if (elapsed > MAX_DOWNLOAD_TIME_MS || !item.startedAt) {
          // Download was interrupted or took too long
          log.info(`Resetting stale download: ${item.url} (elapsed: ${Math.round(elapsed / 1000)}s)`);
          return {
            ...item,
            status: DownloadStatus.Pending,
            progress: undefined,
            error: 'Download was interrupted. Click retry to restart.',
          };
        }

        // Still within timeout - keep status but clear progress (will need to reconnect)
        log.info(`Keeping active download: ${item.url} (elapsed: ${Math.round(elapsed / 1000)}s)`);
        return { ...item, progress: undefined };
      }
      return item;
    });
  } catch (e) {
    log.error('Failed to load queue from localStorage:', e instanceof Error ? e.message : String(e));
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
      log.debug(`Duplicate URL detected: ${url} (existing ID: ${existing.id})`);
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

  const updateItem = useCallback((
    id: string,
    updates: Partial<IDownloadItem> | ((currentItem: IDownloadItem) => Partial<IDownloadItem>)
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Support functional updates to avoid stale closure issues
        const actualUpdates = typeof updates === 'function' ? updates(item) : updates;
        return { ...item, ...actualUpdates };
      })
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
      log.error('Failed to save queue to localStorage:', e instanceof Error ? e.message : String(e));
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
