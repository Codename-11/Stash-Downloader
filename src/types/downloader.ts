/**
 * Downloader-specific types
 */

import type { IStashPerformer, IStashTag, IStashStudio } from './stash';

export enum DownloadStatus {
  Pending = 'pending',
  Downloading = 'downloading',
  Processing = 'processing',
  Complete = 'complete',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum ContentType {
  Video = 'video',
  Image = 'image',
  Gallery = 'gallery',
}

/**
 * Post-import action to apply metadata via Stash's systems
 */
export type PostImportAction = 'none' | 'identify' | 'scrape_url';

export interface IDownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining?: number; // seconds
}

/**
 * Gallery image for multi-image downloads
 */
export interface IGalleryImage {
  url: string;
  thumbnailUrl?: string;
  filename?: string;
  width?: number;
  height?: number;
  order?: number;
}

/**
 * Capability flags indicating what the scraper was able to extract
 */
export interface IScraperCapabilities {
  hasPerformers?: boolean;
  hasTags?: boolean;
  hasStudio?: boolean;
  hasDescription?: boolean;
  hasDate?: boolean;
  hasRating?: boolean;
}

export interface IScrapedMetadata {
  title?: string;
  description?: string;
  date?: string;
  url: string;
  videoUrl?: string; // Actual video file URL (if different from page URL)
  imageUrl?: string; // Actual image file URL (if different from page URL)
  performers?: string[];
  tags?: string[];
  studio?: string;
  thumbnailUrl?: string;
  duration?: number; // seconds
  quality?: string; // Best available quality (e.g., "1080p", "720p", "4K")
  availableQualities?: string[]; // All available qualities from source (e.g., ["1080p", "720p", "480p"])
  contentType: ContentType;

  // Gallery support (multiple images from one URL)
  galleryImages?: IGalleryImage[];

  // Scraper capability flags
  capabilities?: IScraperCapabilities;

  // Source-specific metadata (e.g., booru sites)
  sourceId?: string; // Post ID for deduplication
  sourceRating?: string; // e.g., "safe", "questionable", "explicit"
  sourceScore?: number; // Community score/votes
  artist?: string; // Primary artist (maps to performer or studio)
}

/**
 * User-edited metadata.
 * Supports both simple name strings (from scraper) and full Stash entity objects.
 */
export interface IEditedMetadata {
  title?: string;
  description?: string;
  date?: string;
  // Name-based metadata (resolved during import)
  performerNames?: string[];
  tagNames?: string[];
  studioName?: string;
  // Full objects (legacy support, may include temp-* IDs for new entities)
  performers?: IStashPerformer[];
  tags?: IStashTag[];
  studio?: IStashStudio;
  rating?: number;
}

export interface IItemLogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

/**
 * Gallery download progress tracking
 */
export interface IGalleryProgress {
  totalImages: number;
  downloadedImages: number;
  currentImageUrl?: string;
}

export interface IDownloadItem {
  id: string;
  url: string;
  status: DownloadStatus;
  progress?: IDownloadProgress;
  error?: string;

  // Metadata
  metadata?: IScrapedMetadata;

  // User-edited metadata
  editedMetadata?: IEditedMetadata;

  // File info
  filePath?: string;
  fileSize?: number;

  // Gallery support
  galleryProgress?: IGalleryProgress;
  filePaths?: string[]; // Array of downloaded file paths (for galleries)

  // Stash integration
  stashId?: string; // Scene/Image/Gallery ID after creation
  existsInStash?: { id: string; title?: string }; // If scene already exists in Stash before import
  postImportAction?: PostImportAction; // Action to take after import (none, identify, scrape_url)

  // Download tracking (for reconnecting after navigation)
  downloadProgressId?: string; // Progress file ID for polling
  downloadResultId?: string; // Result file ID for completion check
  stashJobId?: string; // Stash job ID for cancellation
  lastActivityAt?: Date; // Last progress update timestamp (for stale detection)

  // Logs for this specific item
  logs?: IItemLogEntry[];

  // Timestamps
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IDownloadQueueState {
  items: IDownloadItem[];
  activeDownloads: number;
  totalCompleted: number;
  totalFailed: number;
}

export type LogLevelSetting = 'off' | 'error' | 'warning' | 'info' | 'debug';

export interface IPluginSettings {
  /** Fallback directory if no Stash library is configured. Downloads normally go to Stash video library. */
  serverDownloadPath?: string;
  httpProxy?: string;
  concurrentDownloads: number;
  autoCreatePerformers: boolean;
  autoCreateTags: boolean;
  autoCreateStudios: boolean;
  downloadQuality: 'best' | '1080p' | '720p' | '480p';
  filenameTemplate: string;
  enableNotifications: boolean;
  logLevel: LogLevelSetting;
  showThumbnailPreviews: boolean;
}

// Metadata scraper interface
export interface IMetadataScraper {
  name: string;
  supportedDomains: string[];
  contentTypes: ContentType[]; // What content types this scraper supports
  canHandle(url: string): boolean;
  scrape(url: string): Promise<IScrapedMetadata>;
}
