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
  quality?: string; // Video quality (e.g., "1080p", "720p", "4K")
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
 * User-edited metadata with full Stash entity objects.
 * Stores full objects so we can create new entities if they have temp IDs.
 */
export interface IEditedMetadata {
  title?: string;
  description?: string;
  date?: string;
  performers?: IStashPerformer[]; // Full objects (may include temp-* IDs for new entities)
  tags?: IStashTag[]; // Full objects (may include temp-* IDs for new entities)
  studio?: IStashStudio; // Full object (may include temp-* ID for new entity)
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
