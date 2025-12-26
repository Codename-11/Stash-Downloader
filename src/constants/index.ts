/**
 * Application constants
 */

export const PLUGIN_ID = 'stash-downloader';
export const PLUGIN_NAME = 'Stash Downloader';
// Version is injected at build time via __APP_VERSION__ (from package.json)

export const ROUTES = {
  MAIN: '/plugin/stash-downloader',
  QUEUE: '/plugin/stash-downloader/queue',
  METADATA: '/plugin/stash-downloader/metadata',
  SETTINGS: '/plugin/stash-downloader/settings',
} as const;

export const DEFAULT_SETTINGS = {
  serverDownloadPath: '/data/StashDownloader',
  concurrentDownloads: 3,
  autoCreatePerformers: true,
  autoCreateTags: true,
  autoCreateStudios: false,
  downloadQuality: 'best' as const,
  filenameTemplate: '{title}',
  enableNotifications: true,
  logLevel: 'info' as const,
  showThumbnailPreviews: true,
};

export const STORAGE_KEYS = {
  SETTINGS: 'stash-downloader:settings',
  QUEUE: 'stash-downloader:queue',
  DOWNLOAD_HISTORY: 'stash-downloader:history',
  LOGS: 'stash-downloader:logs',
} as const;

export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  PLAYGROUND: '/playground',
} as const;

export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export const VIDEO_EXTENSIONS = [
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
] as const;

export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
] as const;
