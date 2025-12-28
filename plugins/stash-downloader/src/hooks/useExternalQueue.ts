/**
 * useExternalQueue - Hook for receiving URLs from browser extension
 *
 * Listens for:
 * 1. CustomEvents from content script (real-time updates)
 * 2. localStorage changes (cross-tab communication)
 * 3. URL query parameters (fallback when page wasn't open)
 */

import { useEffect, useRef } from 'react';
import { createLogger } from '@/utils';
import { ContentType } from '@/types';
import type { ContentTypeOption } from '@/components/downloader/URLInputForm';

const log = createLogger('ExternalQueue');
const EXTERNAL_QUEUE_KEY = 'stash-downloader-external-queue';

interface ExternalQueueItem {
  url: string;
  contentType: string;
  options?: Record<string, unknown>;
  timestamp: number;
}

interface UseExternalQueueOptions {
  onUrlReceived: (url: string, contentType: ContentTypeOption) => void;
}

/**
 * Map extension content type strings to our ContentTypeOption
 */
function mapContentType(type: string): ContentTypeOption {
  const normalized = type.toLowerCase();
  if (normalized === 'video' || normalized === ContentType.Video) return ContentType.Video;
  if (normalized === 'image' || normalized === ContentType.Image) return ContentType.Image;
  if (normalized === 'gallery' || normalized === ContentType.Gallery) return ContentType.Gallery;
  return 'auto';
}

export function useExternalQueue({ onUrlReceived }: UseExternalQueueOptions) {
  // Track processed URLs to avoid duplicates
  const processedUrls = useRef(new Set<string>());

  useEffect(() => {
    /**
     * Handle real-time events from browser extension content script
     */
    const handleExternalUrl = (event: Event) => {
      const customEvent = event as CustomEvent<{
        url: string;
        contentType: string;
        options?: Record<string, unknown>;
      }>;

      // Avoid JSON.stringify on detail (causes cross-context security errors in Firefox)
      const { url, contentType } = customEvent.detail;
      log.debug(`[ExternalQueue] CustomEvent received: ${url} (${contentType})`);

      // Deduplicate
      if (processedUrls.current.has(url)) {
        log.debug(`Ignoring duplicate URL from extension: ${url}`);
        return;
      }
      processedUrls.current.add(url);

      // Clear old entries after 5 seconds
      setTimeout(() => processedUrls.current.delete(url), 5000);

      log.info(`Received URL from browser extension: ${url}`);
      onUrlReceived(url, mapContentType(contentType));
    };

    window.addEventListener('stash-downloader-add-url', handleExternalUrl);

    /**
     * Process URLs stored in localStorage (from extension when page wasn't focused)
     * Returns true if any URLs were processed
     */
    const processExternalQueue = (): boolean => {
      try {
        const queueJson = localStorage.getItem(EXTERNAL_QUEUE_KEY);
        log.debug(`[ExternalQueue] localStorage raw value: ${queueJson}`);
        if (!queueJson) return false;

        const queue: ExternalQueueItem[] = JSON.parse(queueJson);
        if (!queue.length) return false;

        log.info(`Processing ${queue.length} URL(s) from external queue`);
        queue.forEach((item, idx) => {
          log.debug(`[ExternalQueue] Item ${idx}: url=${item.url}, contentType=${item.contentType}`);
        });

        let processedAny = false;
        // Process each URL
        queue.forEach((item) => {
          if (!processedUrls.current.has(item.url)) {
            processedUrls.current.add(item.url);
            setTimeout(() => processedUrls.current.delete(item.url), 5000);
            onUrlReceived(item.url, mapContentType(item.contentType));
            processedAny = true;
          }
        });

        // Clear the queue after processing
        localStorage.removeItem(EXTERNAL_QUEUE_KEY);
        return processedAny;
      } catch (e) {
        log.error('Failed to process external queue:', e instanceof Error ? e.message : String(e));
        return false;
      }
    };

    // Delay initial processing slightly to ensure parent component's refs are set
    // This handles the race condition where useExternalQueue's useEffect runs before
    // the parent's ref-update useEffect
    const initialDelay = setTimeout(() => {
      processExternalQueue();
    }, 50);

    // Poll localStorage periodically for a few seconds after mount
    // This handles the race condition when extension's executeScript runs after React mounts
    let pollCount = 0;
    const maxPolls = 10; // Poll for up to 5 seconds (10 * 500ms)
    const pollInterval = setInterval(() => {
      pollCount++;
      if (processExternalQueue() || pollCount >= maxPolls) {
        clearInterval(pollInterval);
      }
    }, 500);

    /**
     * Listen for localStorage changes (from other tabs or extension)
     */
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === EXTERNAL_QUEUE_KEY && event.newValue) {
        processExternalQueue();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    /**
     * Handle URL query parameters (fallback when extension opens a new tab)
     */
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');

    if (urlParam) {
      const typeParam = params.get('type') || 'auto';
      log.info(`Processing URL from query params: ${urlParam}`);

      // Add URL to queue
      onUrlReceived(urlParam, mapContentType(typeParam));

      // Clean up URL params without triggering navigation
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    return () => {
      window.removeEventListener('stash-downloader-add-url', handleExternalUrl);
      window.removeEventListener('storage', handleStorageChange);
      clearTimeout(initialDelay);
      clearInterval(pollInterval);
    };
  }, [onUrlReceived]);
}
