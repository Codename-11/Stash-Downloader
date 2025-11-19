/**
 * Application constants
 */

export const PLUGIN_ID = 'stash-downloader';
export const PLUGIN_NAME = 'Stash Downloader';
export const PLUGIN_VERSION = '0.1.0';

export const ROUTES = {
  MAIN: '/downloader',
  QUEUE: '/downloader/queue',
  METADATA: '/downloader/metadata',
  SETTINGS: '/downloader/settings',
} as const;

export const DEFAULT_SETTINGS = {
  concurrentDownloads: 3,
  autoCreatePerformers: true,
  autoCreateTags: true,
  autoCreateStudios: false,
  downloadQuality: 'best' as const,
  filenameTemplate: '{title}',
  enableNotifications: true,
};

export const STORAGE_KEYS = {
  SETTINGS: 'stash-downloader:settings',
  QUEUE: 'stash-downloader:queue',
  DOWNLOAD_HISTORY: 'stash-downloader:history',
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
