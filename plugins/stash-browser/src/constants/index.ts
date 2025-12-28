/**
 * Stash Browser Plugin Constants
 */

export const PLUGIN_ID = 'stash-browser';
export const PLUGIN_NAME = 'Stash Browser';

// Routes
export const ROUTES = {
  MAIN: '/plugin/stash-browser',
  SEARCH: '/plugin/stash-browser/search',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'stash-browser-settings',
  RECENT_SEARCHES: 'stash-browser-recent-searches',
  FAVORITES: 'stash-browser-favorites',
} as const;

// Supported sources
export const SOURCES = {
  RULE34: 'rule34',
  GELBOORU: 'gelbooru',
  DANBOORU: 'danbooru',
} as const;

export type SourceType = (typeof SOURCES)[keyof typeof SOURCES];

// Default settings
export const DEFAULT_SETTINGS = {
  defaultSource: SOURCES.RULE34,
  resultsPerPage: 40,
  safeMode: false,
  showThumbnails: true,
} as const;

// Grid layout breakpoints
export const GRID_COLUMNS = {
  xs: 2,  // < 480px
  sm: 3,  // 480-768px
  md: 4,  // 768-1024px
  lg: 5,  // 1024-1440px
  xl: 6,  // > 1440px
} as const;

// Rating colors (from shared theme)
export const RATING_COLORS = {
  safe: '#28a745',
  questionable: '#ffc107',
  explicit: '#dc3545',
} as const;

// Stash Downloader integration
export const DOWNLOADER_EVENTS = {
  ADD_TO_QUEUE: 'stash-downloader:add-to-queue',
  QUEUE_UPDATED: 'stash-downloader:queue-updated',
} as const;

// Version
declare const __APP_VERSION__: string;
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0';
