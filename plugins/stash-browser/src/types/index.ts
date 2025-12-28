/**
 * Stash Browser Type Definitions
 */

import type { SourceType } from '@/constants';

/**
 * Booru post interface (normalized across sources)
 */
export interface IBooruPost {
  id: number;
  source: SourceType;

  // URLs
  previewUrl: string;      // Thumbnail
  sampleUrl: string;       // Medium size
  fileUrl: string;         // Full size
  sourceUrl?: string;      // Original source (pixiv, twitter, etc.)

  // Metadata
  tags: string[];
  tagsByCategory?: {
    artist?: string[];
    character?: string[];
    copyright?: string[];
    general?: string[];
    meta?: string[];
  };

  // Media info
  width: number;
  height: number;
  fileSize?: number;
  fileType: 'image' | 'video' | 'gif';

  // Rating
  rating: 'safe' | 'questionable' | 'explicit';

  // Stats
  score?: number;
  favorites?: number;

  // Dates
  createdAt?: string;
}

/**
 * Search parameters
 */
export interface ISearchParams {
  source: SourceType;
  tags: string;
  page: number;
  limit: number;
}

/**
 * Search result
 */
export interface ISearchResult {
  source: SourceType;
  tags: string;
  page: number;
  limit: number;
  count: number;
  posts: IBooruPost[];
  hasMore: boolean;
}

/**
 * Plugin settings
 */
export interface IPluginSettings {
  defaultSource: SourceType;
  resultsPerPage: number;
  safeMode: boolean;
  showThumbnails: boolean;
  httpProxy?: string;
}

/**
 * Selection state for batch operations
 */
export interface ISelectionState {
  selectedIds: Set<number>;
  isSelectMode: boolean;
}

/**
 * Content type for Stash Downloader
 */
export type ContentType = 'Video' | 'Image' | 'Gallery';

/**
 * Queue item for Stash Downloader integration
 */
export interface IQueueItem {
  url: string;
  contentType: ContentType;
  metadata?: {
    title?: string;
    tags?: string[];
    source?: string;
  };
}
