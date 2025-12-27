/**
 * Shared import callback factory
 * Creates standardized callbacks for importToStash operations
 */

import { DownloadStatus } from '@/types';
import type { IDownloadProgress, IItemLogEntry } from '@/types';
import type { IDownloadItem } from '@/types';

type UpdateItemFn = (
  id: string,
  update: Partial<IDownloadItem> | ((item: IDownloadItem) => Partial<IDownloadItem>)
) => void;

interface ImportCallbackOptions {
  itemId: string;
  updateItem: UpdateItemFn;
  debugLog?: { debug: (message: string, details?: string) => void };
}

/**
 * Creates standardized import callbacks for use with importToStash
 */
export function createImportCallbacks({ itemId, updateItem, debugLog }: ImportCallbackOptions) {
  return {
    onProgress: (progress: IDownloadProgress) => {
      updateItem(itemId, {
        progress,
        status: DownloadStatus.Downloading,
        lastActivityAt: new Date(),
      });
    },
    onStatusChange: (status: string) => {
      const newStatus = status.includes('Downloading')
        ? DownloadStatus.Downloading
        : DownloadStatus.Processing;
      updateItem(itemId, { status: newStatus });
    },
    onLog: (level: IItemLogEntry['level'], message: string, details?: string) => {
      const newLog: IItemLogEntry = {
        timestamp: new Date(),
        level,
        message,
        details,
      };
      updateItem(itemId, (currentItem) => ({
        logs: [...(currentItem.logs || []), newLog],
      }));
    },
    onJobStart: (jobId: string) => {
      debugLog?.debug('Import job started with ID:', jobId);
      updateItem(itemId, {
        stashJobId: jobId,
        lastActivityAt: new Date(),
      });
    },
  };
}

/**
 * Process items concurrently with a limit
 * @param items Array of items to process
 * @param processor Async function to process each item
 * @param concurrency Max concurrent operations (default: 3)
 */
export async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<{ results: (R | Error)[]; successCount: number; failCount: number }> {
  const results: (R | Error)[] = [];
  let successCount = 0;
  let failCount = 0;
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    const index = currentIndex++;
    if (index >= items.length) return;

    const item = items[index];
    if (item === undefined) return;

    try {
      const result = await processor(item, index);
      results[index] = result;
      successCount++;
    } catch (error) {
      results[index] = error instanceof Error ? error : new Error(String(error));
      failCount++;
    }

    // Process next item in queue
    await processNext();
  }

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);

  return { results, successCount, failCount };
}
