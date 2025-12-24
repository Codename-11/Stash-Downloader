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

      const { url, contentType } = customEvent.detail;

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
     */
    const processExternalQueue = () => {
      try {
        const queueJson = localStorage.getItem(EXTERNAL_QUEUE_KEY);
        if (!queueJson) return;

        const queue: ExternalQueueItem[] = JSON.parse(queueJson);
        if (!queue.length) return;

        log.info(`Processing ${queue.length} URL(s) from external queue`);

        // Process each URL
        queue.forEach((item) => {
          if (!processedUrls.current.has(item.url)) {
            processedUrls.current.add(item.url);
            setTimeout(() => processedUrls.current.delete(item.url), 5000);
            onUrlReceived(item.url, mapContentType(item.contentType));
          }
        });

        // Clear the queue after processing
        localStorage.removeItem(EXTERNAL_QUEUE_KEY);
      } catch (e) {
        log.error('Failed to process external queue:', e instanceof Error ? e.message : String(e));
      }
    };

    // Process any queued URLs on mount
    processExternalQueue();

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
    };
  }, [onUrlReceived]);
}
