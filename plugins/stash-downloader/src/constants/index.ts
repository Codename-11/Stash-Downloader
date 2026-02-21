/**
 * Application constants
 */

/**
 * Detect plugin ID dynamically.
 * When installed as dev build, the YAML is renamed to stash-downloader-dev.yml,
 * so Stash assigns plugin ID "stash-downloader-dev". We detect this from the
 * script URL path (/plugin/stash-downloader-dev/javascript) to ensure
 * runPluginTask targets the correct plugin instance.
 */
function detectPluginId(): string {
  try {
    // Check current page URL for plugin route
    if (typeof window !== 'undefined' && window.location?.pathname) {
      if (window.location.pathname.includes('/plugin/stash-downloader-dev')) {
        return 'stash-downloader-dev';
      }
    }
    // Check if our JS was loaded from the dev plugin path
    if (typeof document !== 'undefined') {
      const scripts = document.querySelectorAll('script[src*="stash-downloader"]');
      for (const script of scripts) {
        const src = script.getAttribute('src') || '';
        if (src.includes('stash-downloader-dev')) {
          return 'stash-downloader-dev';
        }
      }
    }
  } catch {
    // Fallback to stable ID
  }
  return 'stash-downloader';
}

export const PLUGIN_ID = detectPluginId();
export const PLUGIN_NAME = PLUGIN_ID === 'stash-downloader-dev' ? 'Stash Downloader (Dev)' : 'Stash Downloader';
// Version is injected at build time via __APP_VERSION__ (from package.json)

export const ROUTES = {
  MAIN: `/plugin/${PLUGIN_ID}`,
  QUEUE: `/plugin/${PLUGIN_ID}/queue`,
  METADATA: `/plugin/${PLUGIN_ID}/metadata`,
  SETTINGS: `/plugin/${PLUGIN_ID}/settings`,
};

export const DEFAULT_SETTINGS = {
  serverDownloadPath: '/data/StashDownloader',
  autoCreatePerformers: true,
  autoCreateTags: true,
  autoCreateStudios: false,
  downloadQuality: 'best' as const,
  filenameTemplate: '{title}',
  enableNotifications: true,
  logLevel: 'info' as const,
  showThumbnailPreviews: true,
  autoImport: false,
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
