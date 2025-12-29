/**
 * Stash Browser Type Definitions
 */

import type { SourceType } from '@/constants';

/**
 * Raw booru post from API (before normalization)
 * Different APIs have different field names - this covers common fields
 */
export interface BooruPost {
  id: number;
  source?: SourceType;

  // File URLs (different APIs use different names)
  file_url?: string;
  sample_url?: string;
  preview_url?: string;
  large_file_url?: string;      // Danbooru
  preview_file_url?: string;    // Danbooru

  // Dimensions
  width?: number;
  height?: number;
  image_width?: number;         // Danbooru
  image_height?: number;        // Danbooru

  // Tags (string or array depending on API)
  tags?: string | string[];
  tag_string?: string;          // Danbooru

  // Rating
  rating?: string;

  // Stats
  score?: number;

  // Raw data preserved
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _raw?: any;

  // Allow additional properties from API
  [key: string]: unknown;
}

/**
 * Search result from API
 */
export interface SearchResult {
  source: string;
  tags: string;
  page: number;
  limit: number;
  count: number;
  posts: BooruPost[];
}

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
 * Sort options for search
 */
export type SortOption = 'score' | 'id' | 'updated';

/**
 * Rating filter options
 */
export type RatingFilter = 'all' | 'safe' | 'questionable' | 'explicit';

/**
 * Media type filter options
 */
export type MediaTypeFilter = 'all' | 'image' | 'video';

/**
 * Search parameters
 */
export interface ISearchParams {
  source: SourceType;
  tags: string;
  page: number;
  limit: number;
  sort?: SortOption;
  rating?: RatingFilter;
  mediaType?: MediaTypeFilter;
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
