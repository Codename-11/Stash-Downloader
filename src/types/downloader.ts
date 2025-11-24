/**
 * Downloader-specific types
 */

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
}

export interface IItemLogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
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
  editedMetadata?: {
    title?: string;
    description?: string;
    date?: string;
    performerIds?: string[];
    tagIds?: string[];
    studioId?: string;
    rating?: number;
  };

  // File info
  filePath?: string;
  fileSize?: number;

  // Stash integration
  stashId?: string; // Scene/Image/Gallery ID after creation

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

export interface IPluginSettings {
  defaultDownloadPath?: string;
  concurrentDownloads: number;
  autoCreatePerformers: boolean;
  autoCreateTags: boolean;
  autoCreateStudios: boolean;
  downloadQuality: 'best' | '1080p' | '720p' | '480p';
  filenameTemplate: string;
  enableNotifications: boolean;
}

// Metadata scraper interface
export interface IMetadataScraper {
  name: string;
  supportedDomains: string[];
  canHandle(url: string): boolean;
  scrape(url: string): Promise<IScrapedMetadata>;
}
